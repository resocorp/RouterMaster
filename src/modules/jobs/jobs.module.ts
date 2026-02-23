import { Module, Injectable, Logger } from '@nestjs/common';
import { TypeOrmModule, InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, IsNull, LessThanOrEqual } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Subscriber } from '../subscribers/entities/subscriber.entity';
import { ServicePlan } from '../service-plans/entities/service-plan.entity';
import { ServiceChange } from '../subscribers/entities/service-change.entity';
import { Radacct } from '../radius/entities/radacct.entity';
import { SyslogEntry } from '../reports/entities/syslog.entity';

@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name);

  constructor(
    @InjectRepository(Subscriber) private readonly subRepo: Repository<Subscriber>,
    @InjectRepository(ServicePlan) private readonly planRepo: Repository<ServicePlan>,
    @InjectRepository(ServiceChange) private readonly changeRepo: Repository<ServiceChange>,
    @InjectRepository(Radacct) private readonly radacctRepo: Repository<Radacct>,
    @InjectRepository(SyslogEntry) private readonly syslogRepo: Repository<SyslogEntry>,
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async checkExpiredSubscribers() {
    const now = new Date();
    const expired = await this.subRepo.find({
      where: { status: 'active', enabled: true, expiryDate: LessThan(now) },
      relations: ['plan'],
    });

    for (const sub of expired) {
      if (sub.plan?.autoRenew && Number(sub.balance) >= Number(sub.plan.grossUnitPrice)) {
        sub.balance = Number(sub.balance) - Number(sub.plan.grossUnitPrice);
        const expiry = new Date(now);
        if (sub.plan.expiryUnit === 'days') expiry.setDate(expiry.getDate() + sub.plan.initialExpiryVal);
        else expiry.setMonth(expiry.getMonth() + sub.plan.initialExpiryVal);
        sub.expiryDate = expiry;

        if (sub.plan.resetOnExpiry) {
          sub.dlLimitBytes = (BigInt(sub.plan.initialDlMb) * 1048576n).toString();
          sub.ulLimitBytes = (BigInt(sub.plan.initialUlMb) * 1048576n).toString();
          sub.totalLimitBytes = (BigInt(sub.plan.initialTotalMb) * 1048576n).toString();
          sub.timeLimitSecs = sub.plan.initialTimeSecs;
        }

        sub.alertSent = false;
        await this.subRepo.save(sub);
        this.logger.log(`Auto-renewed: ${sub.username}`);
      } else {
        sub.status = 'expired';
        await this.subRepo.save(sub);
        this.logger.log(`Expired: ${sub.username}`);
      }
    }

    if (expired.length > 0) {
      this.logger.log(`Expiry check: processed ${expired.length} subscribers`);
    }
  }

  @Cron('0 0 * * *')
  async dailyReset() {
    const today = new Date().toISOString().split('T')[0];
    const result = await this.subRepo.update(
      { dailyResetAt: LessThan(new Date(today)) as any },
      { dailyDlUsed: '0', dailyUlUsed: '0', dailyTotalUsed: '0', dailyTimeUsed: 0, dailyResetAt: new Date(today) },
    );
    this.logger.log(`Daily reset: ${result.affected} subscribers reset`);
  }

  @Cron(CronExpression.EVERY_10_MINUTES)
  async sessionPoller() {
    const stale = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const result = await this.radacctRepo.update(
      { stopTime: IsNull(), updateTime: LessThan(stale) },
      { stopTime: new Date(), terminateCause: 'Stale-Session' },
    );
    if (result.affected && result.affected > 0) {
      this.logger.log(`Session poller: closed ${result.affected} stale sessions`);
    }
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async processScheduledChanges() {
    const now = new Date();
    const pending = await this.changeRepo.find({
      where: { status: 'scheduled', scheduleDate: LessThanOrEqual(now) },
    });

    for (const change of pending) {
      const sub = await this.subRepo.findOne({ where: { id: change.subscriberId } });
      if (sub && change.newPlanId) {
        sub.planId = change.newPlanId;
        await this.subRepo.save(sub);
        change.status = 'completed';
        await this.changeRepo.save(change);
        this.logger.log(`Scheduled change completed for subscriber ${sub.username}`);
      }
    }
  }

  @Cron('0 6 * * *')
  async expiryAlerts() {
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

    const expiringSoon = await this.subRepo.find({
      where: {
        status: 'active',
        enabled: true,
        alertSent: false,
        expiryDate: LessThanOrEqual(threeDaysFromNow),
      },
    });

    for (const sub of expiringSoon) {
      sub.alertSent = true;
      await this.subRepo.save(sub);
    }

    if (expiringSoon.length > 0) {
      this.logger.log(`Expiry alerts: flagged ${expiringSoon.length} subscribers`);
    }
  }

  @Cron('0 2 * * 0')
  async weeklyCleanup() {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const syslogResult = await this.syslogRepo.delete({ createdAt: LessThan(thirtyDaysAgo) });
    this.logger.log(`Weekly cleanup: removed ${syslogResult.affected} old syslog entries`);
  }
}

@Module({
  imports: [TypeOrmModule.forFeature([Subscriber, ServicePlan, ServiceChange, Radacct, SyslogEntry])],
  providers: [JobsService],
  exports: [JobsService],
})
export class JobsModule {}
