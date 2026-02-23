import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, DataSource, DeepPartial } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Subscriber } from '../subscribers/entities/subscriber.entity';
import { ServicePlan } from '../service-plans/entities/service-plan.entity';
import { NasDevice } from '../nas/entities/nas-device.entity';
import { Radacct } from './entities/radacct.entity';
import { Radpostauth } from './entities/radpostauth.entity';
import { SpecialAccounting } from '../service-plans/entities/special-accounting.entity';
import { RadiusReplyBuilder, RadiusReplyAttributes } from './radius-reply.builder';

@Injectable()
export class RadiusService {
  private readonly logger = new Logger(RadiusService.name);

  constructor(
    @InjectRepository(Subscriber)
    private readonly subscriberRepo: Repository<Subscriber>,
    @InjectRepository(NasDevice)
    private readonly nasRepo: Repository<NasDevice>,
    @InjectRepository(Radacct)
    private readonly radacctRepo: Repository<Radacct>,
    @InjectRepository(Radpostauth)
    private readonly radpostauthRepo: Repository<Radpostauth>,
    @InjectRepository(SpecialAccounting)
    private readonly specialAcctRepo: Repository<SpecialAccounting>,
    @InjectRepository(ServicePlan)
    private readonly planRepo: Repository<ServicePlan>,
    private readonly replyBuilder: RadiusReplyBuilder,
    private readonly dataSource: DataSource,
  ) {}

  async authorize(data: {
    username: string;
    password: string;
    nas_ip: string;
    nas_port?: string;
    calling_station?: string;
    called_station?: string;
  }): Promise<{ code: number; attributes: RadiusReplyAttributes }> {
    const nas = await this.nasRepo.findOne({
      where: { ipAddress: data.nas_ip },
    });
    if (!nas) {
      this.logger.warn(`Unknown NAS: ${data.nas_ip}`);
      return { code: 403, attributes: { 'Reply-Message': 'Unknown NAS' } };
    }

    const subscriber = await this.subscriberRepo.findOne({
      where: { username: data.username },
      relations: ['plan'],
    });
    if (!subscriber) {
      return { code: 403, attributes: { 'Reply-Message': 'User not found' } };
    }

    if (!subscriber.enabled) {
      return { code: 403, attributes: { 'Reply-Message': 'Account disabled' } };
    }

    if (subscriber.status === 'disabled') {
      if (subscriber.plan?.nextDisabledId) {
        const fallbackPlan = await this.planRepo.findOne({ where: { id: subscriber.plan.nextDisabledId } });
        if (fallbackPlan) {
          return { code: 200, attributes: this.replyBuilder.build(subscriber, fallbackPlan, nas) };
        }
      }
      return { code: 403, attributes: { 'Reply-Message': 'Account disabled' } };
    }

    let plan = subscriber.plan;
    if (!plan) {
      return { code: 403, attributes: { 'Reply-Message': 'No service plan assigned' } };
    }

    if (plan.capExpiry && subscriber.expiryDate && new Date(subscriber.expiryDate) < new Date()) {
      if (plan.nextExpiredId) {
        const expiredPlan = await this.planRepo.findOne({ where: { id: plan.nextExpiredId } });
        if (expiredPlan) {
          plan = expiredPlan;
        } else {
          return { code: 403, attributes: { 'Reply-Message': 'Account expired' } };
        }
      } else {
        return { code: 403, attributes: { 'Reply-Message': 'Account expired' } };
      }
    }

    if (plan.capDownload && BigInt(subscriber.dlLimitBytes) <= 0n) {
      if (plan.nextExpiredId) {
        const fallback = await this.planRepo.findOne({ where: { id: plan.nextExpiredId } });
        if (fallback) { plan = fallback; }
        else { return { code: 403, attributes: { 'Reply-Message': 'Download limit exceeded' } }; }
      } else {
        return { code: 403, attributes: { 'Reply-Message': 'Download limit exceeded' } };
      }
    }

    if (plan.capUpload && BigInt(subscriber.ulLimitBytes) <= 0n) {
      return { code: 403, attributes: { 'Reply-Message': 'Upload limit exceeded' } };
    }

    if (plan.capTotal && BigInt(subscriber.totalLimitBytes) <= 0n) {
      return { code: 403, attributes: { 'Reply-Message': 'Total traffic limit exceeded' } };
    }

    if (plan.capTime && subscriber.timeLimitSecs <= 0) {
      return { code: 403, attributes: { 'Reply-Message': 'Time limit exceeded' } };
    }

    const today = new Date().toISOString().split('T')[0];
    if (subscriber.dailyResetAt?.toISOString().split('T')[0] !== today) {
      await this.subscriberRepo.update(subscriber.id, {
        dailyDlUsed: '0',
        dailyUlUsed: '0',
        dailyTotalUsed: '0',
        dailyTimeUsed: 0,
        dailyResetAt: new Date(today),
      });
      subscriber.dailyDlUsed = '0';
      subscriber.dailyUlUsed = '0';
      subscriber.dailyTotalUsed = '0';
      subscriber.dailyTimeUsed = 0;
    }

    const dailyDlMb = BigInt(plan.dailyDlMb);
    if (dailyDlMb > 0n && BigInt(subscriber.dailyDlUsed) >= dailyDlMb * 1048576n) {
      if (plan.nextDailyId) {
        const dailyPlan = await this.planRepo.findOne({ where: { id: plan.nextDailyId } });
        if (dailyPlan) { plan = dailyPlan; }
        else { return { code: 403, attributes: { 'Reply-Message': 'Daily download limit exceeded' } }; }
      } else {
        return { code: 403, attributes: { 'Reply-Message': 'Daily download limit exceeded' } };
      }
    }

    if (subscriber.simUse > 0) {
      const activeCount = await this.radacctRepo.count({
        where: { username: subscriber.username, tenantId: subscriber.tenantId, stopTime: IsNull() },
      });
      if (activeCount >= subscriber.simUse) {
        return { code: 403, attributes: { 'Reply-Message': 'Maximum sessions exceeded' } };
      }
    }

    if (subscriber.macLock && data.calling_station) {
      const callingMac = data.calling_station.replace(/[:-]/g, '').toUpperCase();
      if (subscriber.macCpe) {
        const storedMac = subscriber.macCpe.replace(/[:-]/g, '').toUpperCase();
        if (callingMac !== storedMac) {
          return { code: 403, attributes: { 'Reply-Message': 'MAC address mismatch' } };
        }
      } else {
        await this.subscriberRepo.update(subscriber.id, { macCpe: data.calling_station });
        this.logger.log(`Locked MAC ${data.calling_station} for user ${subscriber.username}`);
      }
    }

    const now = new Date();
    const currentDay = now.getDay();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:00`;

    const specialRules = await this.specialAcctRepo.find({ where: { planId: plan.id } });
    for (const rule of specialRules) {
      if (rule.daysOfWeek.includes(currentDay)) {
        if (currentTime >= rule.startTime && currentTime <= rule.endTime) {
          if (!rule.authAllowed) {
            return { code: 403, attributes: { 'Reply-Message': 'Access not allowed at this time' } };
          }
        }
      }
    }

    const attributes = this.replyBuilder.build(subscriber, plan, nas);
    return { code: 200, attributes };
  }

  async authenticate(data: {
    username: string;
    password: string;
    nas_ip: string;
    calling_station?: string;
  }): Promise<{ code: number; attributes: RadiusReplyAttributes }> {
    const subscriber = await this.subscriberRepo.findOne({
      where: { username: data.username },
    });
    if (!subscriber) {
      return { code: 403, attributes: { 'Reply-Message': 'User not found' } };
    }

    const valid = await bcrypt.compare(data.password, subscriber.passwordHash);
    if (!valid) {
      return { code: 403, attributes: { 'Reply-Message': 'Invalid password' } };
    }

    return { code: 200, attributes: {} };
  }

  async accounting(data: {
    status_type: string;
    session_id: string;
    unique_id?: string;
    username: string;
    nas_ip: string;
    nas_port?: string;
    nas_port_id?: string;
    framed_ip?: string;
    calling_station?: string;
    called_station?: string;
    session_time?: string;
    input_octets?: string;
    output_octets?: string;
    input_gigawords?: string;
    output_gigawords?: string;
    terminate_cause?: string;
  }): Promise<{ code: number }> {
    const statusType = (data.status_type || '').toLowerCase().replace(/[-\s]/g, '');

    switch (statusType) {
      case 'start':
        await this.handleAcctStart(data);
        break;
      case 'interimupdate':
        await this.handleAcctInterim(data);
        break;
      case 'stop':
        await this.handleAcctStop(data);
        break;
      case 'accountingon':
      case 'accountingoff':
        await this.handleAcctOnOff(data);
        break;
      default:
        this.logger.warn(`Unknown accounting status: ${data.status_type}`);
    }

    return { code: 200 };
  }

  private async handleAcctStart(data: any): Promise<void> {
    const subscriber = await this.subscriberRepo.findOne({ where: { username: data.username } });
    const nas = await this.nasRepo.findOne({ where: { ipAddress: data.nas_ip } });

    const record = this.radacctRepo.create({
      sessionId: data.session_id,
      uniqueId: data.unique_id || data.session_id,
      subscriberId: subscriber?.id || null,
      username: data.username,
      nasId: nas?.id || null,
      nasIp: data.nas_ip,
      nasPortId: data.nas_port_id,
      framedIp: data.framed_ip || null,
      callingStation: data.calling_station,
      calledStation: data.called_station,
      startTime: new Date(),
      updateTime: new Date(),
      sessionTime: 0,
      inputOctets: '0',
      outputOctets: '0',
      inputGigawords: 0,
      outputGigawords: 0,
      tenantId: subscriber?.tenantId || nas?.tenantId,
    } as DeepPartial<Radacct>);

    await this.radacctRepo.save(record);
    this.logger.log(`Accounting START: ${data.username} session=${data.session_id}`);
  }

  private async handleAcctInterim(data: any): Promise<void> {
    const session = await this.radacctRepo.findOne({
      where: { sessionId: data.session_id, stopTime: IsNull() },
      order: { startTime: 'DESC' },
    });

    if (!session) {
      this.logger.warn(`Interim update for unknown session: ${data.session_id}`);
      await this.handleAcctStart(data);
      return;
    }

    const prevInputTotal = BigInt(session.inputOctets) + BigInt(session.inputGigawords) * 4294967296n;
    const prevOutputTotal = BigInt(session.outputOctets) + BigInt(session.outputGigawords) * 4294967296n;

    const newInputOctets = BigInt(data.input_octets || '0');
    const newOutputOctets = BigInt(data.output_octets || '0');
    const newInputGigawords = BigInt(data.input_gigawords || '0');
    const newOutputGigawords = BigInt(data.output_gigawords || '0');

    const newInputTotal = newInputOctets + newInputGigawords * 4294967296n;
    const newOutputTotal = newOutputOctets + newOutputGigawords * 4294967296n;

    let deltaInput = newInputTotal - prevInputTotal;
    let deltaOutput = newOutputTotal - prevOutputTotal;
    if (deltaInput < 0n) deltaInput = newInputTotal;
    if (deltaOutput < 0n) deltaOutput = newOutputTotal;

    const sessionTime = parseInt(data.session_time || '0', 10);

    await this.radacctRepo.update(session.id, {
      updateTime: new Date(),
      sessionTime,
      inputOctets: newInputOctets.toString(),
      outputOctets: newOutputOctets.toString(),
      inputGigawords: Number(newInputGigawords),
      outputGigawords: Number(newOutputGigawords),
      framedIp: data.framed_ip || session.framedIp,
    });

    if (deltaInput > 0n || deltaOutput > 0n) {
      await this.updateSubscriberCounters(data.username, deltaInput, deltaOutput, sessionTime, session);
    }
  }

  private async handleAcctStop(data: any): Promise<void> {
    const session = await this.radacctRepo.findOne({
      where: { sessionId: data.session_id, stopTime: IsNull() },
      order: { startTime: 'DESC' },
    });

    if (!session) {
      this.logger.warn(`Stop for unknown session: ${data.session_id}`);
      return;
    }

    const inputOctets = BigInt(data.input_octets || '0');
    const outputOctets = BigInt(data.output_octets || '0');
    const inputGigawords = parseInt(data.input_gigawords || '0', 10);
    const outputGigawords = parseInt(data.output_gigawords || '0', 10);
    const sessionTime = parseInt(data.session_time || '0', 10);

    await this.radacctRepo.update(session.id, {
      stopTime: new Date(),
      updateTime: new Date(),
      sessionTime,
      inputOctets: inputOctets.toString(),
      outputOctets: outputOctets.toString(),
      inputGigawords,
      outputGigawords,
      terminateCause: data.terminate_cause || 'Unknown',
    });

    const prevInputTotal = BigInt(session.inputOctets) + BigInt(session.inputGigawords) * 4294967296n;
    const prevOutputTotal = BigInt(session.outputOctets) + BigInt(session.outputGigawords) * 4294967296n;
    const newInputTotal = inputOctets + BigInt(inputGigawords) * 4294967296n;
    const newOutputTotal = outputOctets + BigInt(outputGigawords) * 4294967296n;

    let deltaInput = newInputTotal - prevInputTotal;
    let deltaOutput = newOutputTotal - prevOutputTotal;
    if (deltaInput < 0n) deltaInput = newInputTotal;
    if (deltaOutput < 0n) deltaOutput = newOutputTotal;

    if (deltaInput > 0n || deltaOutput > 0n) {
      await this.updateSubscriberCounters(data.username, deltaInput, deltaOutput, sessionTime, session);
    }

    this.logger.log(`Accounting STOP: ${data.username} session=${data.session_id} cause=${data.terminate_cause}`);
  }

  private async handleAcctOnOff(data: any): Promise<void> {
    const result = await this.radacctRepo.update(
      { nasIp: data.nas_ip, stopTime: IsNull() },
      { stopTime: new Date(), terminateCause: 'NAS-Reboot', updateTime: new Date() },
    );
    this.logger.log(`Accounting ON/OFF from ${data.nas_ip}: closed ${result.affected} sessions`);
  }

  private async updateSubscriberCounters(
    username: string,
    deltaInput: bigint,
    deltaOutput: bigint,
    sessionTime: number,
    session: Radacct,
  ): Promise<void> {
    const subscriber = await this.subscriberRepo.findOne({
      where: { username },
      relations: ['plan'],
    });
    if (!subscriber || !subscriber.plan) return;

    const plan = subscriber.plan;
    let ratioInput = 1.0;
    let ratioOutput = 1.0;

    const specialRules = await this.specialAcctRepo.find({ where: { planId: plan.id } });
    if (specialRules.length > 0) {
      const now = new Date();
      const currentDay = now.getDay();
      const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:00`;

      for (const rule of specialRules) {
        if (rule.daysOfWeek.includes(currentDay) && currentTime >= rule.startTime && currentTime <= rule.endTime) {
          ratioInput = Number(rule.ratioUl);
          ratioOutput = Number(rule.ratioDl);
          break;
        }
      }
    }

    const adjustedInput = BigInt(Math.floor(Number(deltaInput) * ratioInput));
    const adjustedOutput = BigInt(Math.floor(Number(deltaOutput) * ratioOutput));

    const updates: any = {};

    if (plan.capDownload) {
      const current = BigInt(subscriber.dlLimitBytes);
      updates.dlLimitBytes = (current - adjustedOutput).toString();
    }
    if (plan.capUpload) {
      const current = BigInt(subscriber.ulLimitBytes);
      updates.ulLimitBytes = (current - adjustedInput).toString();
    }
    if (plan.capTotal) {
      const current = BigInt(subscriber.totalLimitBytes);
      updates.totalLimitBytes = (current - adjustedInput - adjustedOutput).toString();
    }

    updates.dailyDlUsed = (BigInt(subscriber.dailyDlUsed) + adjustedOutput).toString();
    updates.dailyUlUsed = (BigInt(subscriber.dailyUlUsed) + adjustedInput).toString();
    updates.dailyTotalUsed = (BigInt(subscriber.dailyTotalUsed) + adjustedInput + adjustedOutput).toString();

    if (Object.keys(updates).length > 0) {
      await this.subscriberRepo.update(subscriber.id, updates);
    }
  }

  async postAuth(data: {
    username: string;
    password?: string;
    reply: string;
    nas_ip: string;
    nas_port?: string;
    calling_station?: string;
  }): Promise<{ code: number }> {
    const nas = await this.nasRepo.findOne({ where: { ipAddress: data.nas_ip } });

    const record = this.radpostauthRepo.create({
      username: data.username,
      pass: data.password ? '***' : null,
      reply: data.reply,
      nasIp: data.nas_ip,
      nasId: nas?.id || null,
      callingStation: data.calling_station,
      tenantId: nas?.tenantId,
      authDate: new Date(),
    } as DeepPartial<Radpostauth>);

    await this.radpostauthRepo.save(record);
    return { code: 200 };
  }
}
