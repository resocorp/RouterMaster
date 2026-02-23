import { Injectable, Logger, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, Like, In, IsNull, DeepPartial } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Subscriber } from './entities/subscriber.entity';
import { ServicePlan } from '../service-plans/entities/service-plan.entity';
import { Invoice } from '../billing/entities/invoice.entity';
import { ServiceChange } from './entities/service-change.entity';
import { Radacct } from '../radius/entities/radacct.entity';
import { Radpostauth } from '../radius/entities/radpostauth.entity';
import { CreateSubscriberDto } from './dto/create-subscriber.dto';
import { AddCreditsDto, AddDepositDto, ChangeServiceDto, FilterSubscribersDto } from './dto/add-credits.dto';
import { PaginatedResult } from '../../common/dto/pagination.dto';

@Injectable()
export class SubscribersService {
  private readonly logger = new Logger(SubscribersService.name);

  constructor(
    @InjectRepository(Subscriber) private readonly repo: Repository<Subscriber>,
    @InjectRepository(ServicePlan) private readonly planRepo: Repository<ServicePlan>,
    @InjectRepository(Invoice) private readonly invoiceRepo: Repository<Invoice>,
    @InjectRepository(ServiceChange) private readonly changeRepo: Repository<ServiceChange>,
    @InjectRepository(Radacct) private readonly radacctRepo: Repository<Radacct>,
    @InjectRepository(Radpostauth) private readonly radpostauthRepo: Repository<Radpostauth>,
    private readonly dataSource: DataSource,
  ) {}

  async findAll(tenantId: string, filters: FilterSubscribersDto): Promise<PaginatedResult<Subscriber>> {
    const page = filters.page || 1;
    const limit = filters.limit || 25;
    const qb = this.repo.createQueryBuilder('s')
      .leftJoinAndSelect('s.plan', 'plan')
      .leftJoinAndSelect('s.group', 'grp')
      .where('s.tenant_id = :tenantId', { tenantId });

    if (filters.username) qb.andWhere('s.username ILIKE :username', { username: `%${filters.username}%` });
    if (filters.firstName) qb.andWhere('s.first_name ILIKE :fn', { fn: `%${filters.firstName}%` });
    if (filters.lastName) qb.andWhere('s.last_name ILIKE :ln', { ln: `%${filters.lastName}%` });
    if (filters.email) qb.andWhere('s.email ILIKE :email', { email: `%${filters.email}%` });
    if (filters.phone) qb.andWhere('s.phone ILIKE :phone', { phone: `%${filters.phone}%` });
    if (filters.mobile) qb.andWhere('s.mobile ILIKE :mobile', { mobile: `%${filters.mobile}%` });
    if (filters.macCpe) qb.andWhere('s.mac_cpe ILIKE :mac', { mac: `%${filters.macCpe}%` });
    if (filters.staticIpCpe) qb.andWhere('s.static_ip_cpe = :ip', { ip: filters.staticIpCpe });
    if (filters.status) qb.andWhere('s.status = :status', { status: filters.status });
    if (filters.accountType) qb.andWhere('s.account_type = :at', { at: filters.accountType });
    if (filters.planId) qb.andWhere('s.plan_id = :pid', { pid: filters.planId });
    if (filters.managerId) qb.andWhere('s.manager_id = :mid', { mid: filters.managerId });
    if (filters.groupId) qb.andWhere('s.group_id = :gid', { gid: filters.groupId });
    if (filters.enabled !== undefined) qb.andWhere('s.enabled = :en', { en: filters.enabled === 'true' });

    qb.orderBy('s.createdAt', 'DESC').skip((page - 1) * limit).take(limit);
    const [data, total] = await qb.getManyAndCount();
    return new PaginatedResult(data, total, page, limit);
  }

  async findOne(id: string, tenantId: string): Promise<Subscriber> {
    const sub = await this.repo.findOne({ where: { id, tenantId }, relations: ['plan', 'group', 'manager'] });
    if (!sub) throw new NotFoundException('Subscriber not found');
    return sub;
  }

  async create(tenantId: string, dto: CreateSubscriberDto): Promise<Subscriber> {
    const exists = await this.repo.findOne({ where: { username: dto.username, tenantId } });
    if (exists) throw new ConflictException('Username already exists');

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const data: any = { ...dto, tenantId, passwordHash };
    delete data.password;
    const subscriber = this.repo.create(data as DeepPartial<Subscriber>);

    if (dto.planId) {
      const plan = await this.planRepo.findOne({ where: { id: dto.planId, tenantId } });
      if (!plan) throw new BadRequestException('Service plan not found');
      subscriber.dlLimitBytes = (BigInt(plan.initialDlMb) * 1048576n).toString();
      subscriber.ulLimitBytes = (BigInt(plan.initialUlMb) * 1048576n).toString();
      subscriber.totalLimitBytes = (BigInt(plan.initialTotalMb) * 1048576n).toString();
      subscriber.timeLimitSecs = plan.initialTimeSecs;
      if (plan.capExpiry) {
        const expiry = new Date();
        if (plan.expiryUnit === 'days') expiry.setDate(expiry.getDate() + plan.initialExpiryVal);
        else expiry.setMonth(expiry.getMonth() + plan.initialExpiryVal);
        subscriber.expiryDate = expiry;
      }
    }

    return this.repo.save(subscriber);
  }

  async update(id: string, tenantId: string, dto: Partial<CreateSubscriberDto>): Promise<Subscriber> {
    const sub = await this.findOne(id, tenantId);
    if (dto.password) {
      (dto as any).passwordHash = await bcrypt.hash(dto.password, 10);
      delete dto.password;
    }
    Object.assign(sub, dto);
    return this.repo.save(sub);
  }

  async remove(id: string, tenantId: string): Promise<void> {
    const sub = await this.findOne(id, tenantId);
    await this.repo.remove(sub);
  }

  async addCredits(id: string, tenantId: string, dto: AddCreditsDto, managerId?: string): Promise<Subscriber> {
    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();

    try {
      const sub = await qr.manager.findOne(Subscriber, { where: { id, tenantId }, relations: ['plan'] });
      if (!sub) throw new NotFoundException('Subscriber not found');
      if (!sub.plan) throw new BadRequestException('No service plan assigned');

      const plan = sub.plan;
      const amount = dto.amount;

      if (plan.trafficAddMode === 'reset') {
        sub.dlLimitBytes = (BigInt(plan.dlTrafficUnitMb) * BigInt(amount) * 1048576n).toString();
        sub.ulLimitBytes = (BigInt(plan.ulTrafficUnitMb) * BigInt(amount) * 1048576n).toString();
        sub.totalLimitBytes = (BigInt(plan.totalTrafficUnitMb) * BigInt(amount) * 1048576n).toString();
      } else {
        sub.dlLimitBytes = (BigInt(sub.dlLimitBytes) + BigInt(plan.dlTrafficUnitMb) * BigInt(amount) * 1048576n).toString();
        sub.ulLimitBytes = (BigInt(sub.ulLimitBytes) + BigInt(plan.ulTrafficUnitMb) * BigInt(amount) * 1048576n).toString();
        sub.totalLimitBytes = (BigInt(sub.totalLimitBytes) + BigInt(plan.totalTrafficUnitMb) * BigInt(amount) * 1048576n).toString();
      }

      const now = new Date();
      if (plan.dateAddMode === 'reset') {
        const expiry = new Date(now);
        if (plan.expiryUnit === 'days') expiry.setDate(expiry.getDate() + amount);
        else expiry.setMonth(expiry.getMonth() + amount);
        sub.expiryDate = expiry;
      } else if (plan.dateAddMode === 'prolong') {
        const base = sub.expiryDate ? new Date(sub.expiryDate) : now;
        if (plan.expiryUnit === 'days') base.setDate(base.getDate() + amount);
        else base.setMonth(base.getMonth() + amount);
        sub.expiryDate = base;
      } else {
        const base = (sub.expiryDate && new Date(sub.expiryDate) > now) ? new Date(sub.expiryDate) : now;
        if (plan.expiryUnit === 'days') base.setDate(base.getDate() + amount);
        else base.setMonth(base.getMonth() + amount);
        sub.expiryDate = base;
      }

      if (plan.timeAddMode === 'reset') {
        const timeVal = plan.timeUnit === 'hours' ? amount * 3600 : amount * 60;
        sub.timeLimitSecs = timeVal;
      } else {
        const timeVal = plan.timeUnit === 'hours' ? amount * 3600 : amount * 60;
        sub.timeLimitSecs = (sub.timeLimitSecs || 0) + timeVal;
      }

      sub.status = 'active';
      sub.enabled = true;
      sub.alertSent = false;

      await qr.manager.save(sub);

      const grossPrice = Number(plan.grossUnitPrice) * amount;
      const netPrice = Number(plan.netUnitPrice) * amount;
      const vatAmount = grossPrice - netPrice;

      const invoice = qr.manager.create(Invoice, {
        tenantId,
        subscriberId: id,
        managerId: managerId || null,
        type: (dto.paymentType || 'cash') as any,
        serviceName: plan.name,
        amount,
        quantity: amount,
        netPrice,
        vatAmount,
        grossPrice,
        remark: dto.remark || `Credits added: ${amount} units`,
        paymentDate: now,
      } as DeepPartial<Invoice>);
      await qr.manager.save(invoice);

      await qr.commitTransaction();
      this.logger.log(`Credits added for ${sub.username}: ${amount} units, price=${grossPrice}`);
      return sub;
    } catch (err) {
      await qr.rollbackTransaction();
      throw err;
    } finally {
      await qr.release();
    }
  }

  async addDeposit(id: string, tenantId: string, dto: AddDepositDto): Promise<Subscriber> {
    const sub = await this.findOne(id, tenantId);
    sub.balance = Number(sub.balance) + dto.amount;
    await this.repo.save(sub);

    const invoice = this.invoiceRepo.create({
      tenantId, subscriberId: id, type: 'internal',
      serviceName: 'Balance deposit', amount: dto.amount, quantity: 1,
      grossPrice: dto.amount, netPrice: dto.amount, vatAmount: 0,
      remark: dto.remark || 'Balance deposit', paymentDate: new Date(),
    });
    await this.invoiceRepo.save(invoice);
    return sub;
  }

  async changeService(id: string, tenantId: string, dto: ChangeServiceDto, requestedBy?: string): Promise<any> {
    const sub = await this.findOne(id, tenantId);
    const newPlan = await this.planRepo.findOne({ where: { id: dto.newPlanId, tenantId } });
    if (!newPlan) throw new BadRequestException('New plan not found');

    if (dto.scheduleDate) {
      const change = this.changeRepo.create({
        tenantId, subscriberId: id, requestedBy,
        oldPlanId: sub.planId, newPlanId: dto.newPlanId,
        scheduleDate: new Date(dto.scheduleDate), status: 'scheduled',
      });
      await this.changeRepo.save(change);
      return { scheduled: true, changeId: change.id };
    }

    const oldPlanId = sub.planId;
    sub.planId = dto.newPlanId;
    await this.repo.save(sub);

    const change = this.changeRepo.create({
      tenantId, subscriberId: id, requestedBy,
      oldPlanId, newPlanId: dto.newPlanId,
      scheduleDate: new Date(), status: 'completed',
    });
    await this.changeRepo.save(change);
    return { scheduled: false, subscriber: sub };
  }

  async getTraffic(id: string, tenantId: string) {
    const sub = await this.findOne(id, tenantId);
    const sessions = await this.radacctRepo.createQueryBuilder('r')
      .select("DATE_TRUNC('day', r.start_time)", 'date')
      .addSelect('SUM(r.input_octets + r.input_gigawords * 4294967296)', 'upload')
      .addSelect('SUM(r.output_octets + r.output_gigawords * 4294967296)', 'download')
      .addSelect('SUM(r.session_time)', 'time')
      .where('r.username = :username AND r.tenant_id = :tenantId', { username: sub.username, tenantId })
      .groupBy("DATE_TRUNC('day', r.start_time)")
      .orderBy('date', 'DESC')
      .limit(365)
      .getRawMany();
    return sessions;
  }

  async getAuthLog(id: string, tenantId: string) {
    const sub = await this.findOne(id, tenantId);
    return this.radpostauthRepo.find({
      where: { username: sub.username, tenantId },
      order: { authDate: 'DESC' },
      take: 100,
    });
  }

  async getInvoices(id: string, tenantId: string) {
    return this.invoiceRepo.find({
      where: { subscriberId: id, tenantId },
      order: { createdAt: 'DESC' },
    });
  }

  async getServiceHistory(id: string, tenantId: string) {
    return this.changeRepo.find({
      where: { subscriberId: id, tenantId },
      order: { createdAt: 'DESC' },
    });
  }

  async bulkEnable(ids: string[], tenantId: string) {
    return this.repo.update({ id: In(ids), tenantId }, { enabled: true });
  }

  async bulkDisable(ids: string[], tenantId: string) {
    return this.repo.update({ id: In(ids), tenantId }, { enabled: false });
  }

  async bulkDelete(ids: string[], tenantId: string) {
    return this.repo.delete({ id: In(ids), tenantId });
  }
}
