import { Module, Injectable, Controller, Get, Query, UseGuards, Logger } from '@nestjs/common';
import { TypeOrmModule, InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, Between, Not } from 'typeorm';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Radacct } from '../radius/entities/radacct.entity';
import { Radpostauth } from '../radius/entities/radpostauth.entity';
import { Subscriber } from '../subscribers/entities/subscriber.entity';
import { NasDevice } from '../nas/entities/nas-device.entity';
import { UserGroup } from '../user-groups/entities/user-group.entity';
import { Invoice } from '../billing/entities/invoice.entity';
import { SyslogEntry } from './entities/syslog.entity';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { TenantId } from '../../common/decorators/tenant-id.decorator';

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(
    @InjectRepository(Radacct) private readonly radacctRepo: Repository<Radacct>,
    @InjectRepository(Radpostauth) private readonly authRepo: Repository<Radpostauth>,
    @InjectRepository(Subscriber) private readonly subRepo: Repository<Subscriber>,
    @InjectRepository(Invoice) private readonly invoiceRepo: Repository<Invoice>,
    @InjectRepository(SyslogEntry) private readonly syslogRepo: Repository<SyslogEntry>,
    @InjectRepository(NasDevice) private readonly nasRepo: Repository<NasDevice>,
    @InjectRepository(UserGroup) private readonly groupRepo: Repository<UserGroup>,
  ) {}

  async trafficSummary(tenantId: string, from?: string, to?: string) {
    const qb = this.radacctRepo.createQueryBuilder('r')
      .select("DATE_TRUNC('day', r.start_time)", 'date')
      .addSelect('COUNT(*)', 'sessions')
      .addSelect('SUM(r.input_octets + r.input_gigawords * 4294967296)', 'totalUpload')
      .addSelect('SUM(r.output_octets + r.output_gigawords * 4294967296)', 'totalDownload')
      .addSelect('SUM(r.session_time)', 'totalTime')
      .where('r.tenant_id = :tenantId', { tenantId })
      .groupBy("DATE_TRUNC('day', r.start_time)")
      .orderBy('date', 'DESC')
      .limit(365);
    if (from) qb.andWhere('r.start_time >= :from', { from });
    if (to) qb.andWhere('r.start_time <= :to', { to });
    return qb.getRawMany();
  }

  async topUsers(tenantId: string, limit = 20) {
    return this.radacctRepo.createQueryBuilder('r')
      .select('r.username', 'username')
      .addSelect('SUM(r.output_octets + r.output_gigawords * 4294967296)', 'totalDownload')
      .addSelect('SUM(r.input_octets + r.input_gigawords * 4294967296)', 'totalUpload')
      .addSelect('SUM(r.session_time)', 'totalTime')
      .addSelect('COUNT(*)', 'sessions')
      .where('r.tenant_id = :tenantId', { tenantId })
      .groupBy('r.username')
      .orderBy('"totalDownload"', 'DESC')
      .limit(limit)
      .getRawMany();
  }

  async authFailures(tenantId: string, limit = 100) {
    return this.authRepo.find({
      where: { tenantId, reply: 'Access-Reject' },
      order: { authDate: 'DESC' },
      take: limit,
    });
  }

  async revenueSummary(tenantId: string, from?: string, to?: string) {
    const qb = this.invoiceRepo.createQueryBuilder('i')
      .select("DATE_TRUNC('month', i.created_at)", 'month')
      .addSelect('i.type', 'type')
      .addSelect('COUNT(*)', 'count')
      .addSelect('SUM(i.gross_price)', 'revenue')
      .where('i.tenant_id = :tenantId', { tenantId })
      .groupBy("DATE_TRUNC('month', i.created_at)")
      .addGroupBy('i.type')
      .orderBy('month', 'DESC');
    if (from) qb.andWhere('i.created_at >= :from', { from });
    if (to) qb.andWhere('i.created_at <= :to', { to });
    return qb.getRawMany();
  }

  async subscriberStats(tenantId: string) {
    const total = await this.subRepo.count({ where: { tenantId } });
    const active = await this.subRepo.count({ where: { tenantId, status: 'active', enabled: true } });
    const disabled = await this.subRepo.count({ where: { tenantId, enabled: false } });
    const expired = await this.subRepo.count({ where: { tenantId, status: 'expired' } });
    const online = await this.radacctRepo.count({ where: { tenantId, stopTime: IsNull() } });
    return { total, active, disabled, expired, online };
  }

  async onlineRadiusUsers(tenantId: string, filters: { nasId?: string; ap?: string; groupId?: string; username?: string; page?: number; limit?: number }) {
    const page = filters.page || 1;
    const limit = filters.limit || 50;

    const qb = this.radacctRepo.createQueryBuilder('r')
      .leftJoin(Subscriber, 's', 's.username = r.username AND s.tenant_id = r.tenant_id')
      .leftJoin(NasDevice, 'n', 'n.id = r.nas_id')
      .leftJoin(UserGroup, 'g', 'g.id = s.group_id')
      .select([
        'r.id AS id',
        'r.username AS username',
        'r.start_time AS "startTime"',
        'r.session_time AS "sessionTime"',
        'r.output_octets AS "outputOctets"',
        'r.output_gigawords AS "outputGigawords"',
        'r.input_octets AS "inputOctets"',
        'r.input_gigawords AS "inputGigawords"',
        'r.framed_ip AS "framedIp"',
        'r.calling_station AS "callingStation"',
        'r.ap_name AS "apName"',
        'n.name AS "nasName"',
        'g.name AS "groupName"',
        's.first_name AS "firstName"',
        's.last_name AS "lastName"',
        's.company AS company',
        's.address AS address',
        's.city AS city',
        's.zip AS zip',
        's.country AS country',
        's.state AS state',
        's.email AS email',
        's.comment AS comment',
      ])
      .where('r.tenant_id = :tenantId', { tenantId })
      .andWhere('r.stop_time IS NULL');

    if (filters.nasId) qb.andWhere('r.nas_id = :nasId', { nasId: filters.nasId });
    if (filters.ap) qb.andWhere('r.ap_name = :ap', { ap: filters.ap });
    if (filters.groupId) qb.andWhere('s.group_id = :groupId', { groupId: filters.groupId });
    if (filters.username) qb.andWhere('r.username ILIKE :username', { username: `%${filters.username}%` });

    const total = await qb.getCount();
    const data = await qb
      .orderBy('r.start_time', 'DESC')
      .offset((page - 1) * limit)
      .limit(limit)
      .getRawMany();

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async connectionReport(tenantId: string, filters: { nasId?: string; username?: string; from?: string; to?: string; page?: number; limit?: number }) {
    const page = filters.page || 1;
    const limit = filters.limit || 50;

    const qb = this.radacctRepo.createQueryBuilder('r')
      .leftJoin(NasDevice, 'n', 'n.id = r.nas_id')
      .select([
        'r.id AS id',
        'r.username AS username',
        'r.start_time AS "startTime"',
        'r.stop_time AS "stopTime"',
        'r.session_time AS "sessionTime"',
        'r.output_octets AS "outputOctets"',
        'r.output_gigawords AS "outputGigawords"',
        'r.input_octets AS "inputOctets"',
        'r.input_gigawords AS "inputGigawords"',
        'r.framed_ip AS "framedIp"',
        'r.calling_station AS "callingStation"',
        'r.terminate_cause AS "terminateCause"',
        'r.nas_ip AS "nasIp"',
        'n.name AS "nasName"',
      ])
      .where('r.tenant_id = :tenantId', { tenantId })
      .andWhere('r.stop_time IS NOT NULL');

    if (filters.nasId) qb.andWhere('r.nas_id = :nasId', { nasId: filters.nasId });
    if (filters.username) qb.andWhere('r.username ILIKE :username', { username: `%${filters.username}%` });
    if (filters.from) qb.andWhere('r.start_time >= :from', { from: filters.from });
    if (filters.to) qb.andWhere('r.start_time <= :to', { to: filters.to });

    const total = await qb.getCount();
    const data = await qb
      .orderBy('r.stop_time', 'DESC')
      .offset((page - 1) * limit)
      .limit(limit)
      .getRawMany();

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async dailyTrafficReport(tenantId: string, filters: { nasId?: string; username?: string; from?: string; to?: string }) {
    const qb = this.radacctRepo.createQueryBuilder('r')
      .select("DATE_TRUNC('day', r.start_time)", 'date')
      .addSelect('r.username', 'username')
      .addSelect('COUNT(*)', 'sessions')
      .addSelect('SUM(r.output_octets + r.output_gigawords * 4294967296)', 'totalDownload')
      .addSelect('SUM(r.input_octets + r.input_gigawords * 4294967296)', 'totalUpload')
      .addSelect('SUM(r.session_time)', 'totalTime')
      .where('r.tenant_id = :tenantId', { tenantId });

    if (filters.nasId) qb.andWhere('r.nas_id = :nasId', { nasId: filters.nasId });
    if (filters.username) qb.andWhere('r.username ILIKE :username', { username: `%${filters.username}%` });
    if (filters.from) qb.andWhere('r.start_time >= :from', { from: filters.from });
    if (filters.to) qb.andWhere('r.start_time <= :to', { to: filters.to });

    return qb
      .groupBy("DATE_TRUNC('day', r.start_time)")
      .addGroupBy('r.username')
      .orderBy('date', 'DESC')
      .limit(500)
      .getRawMany();
  }

  async findTrafficData(tenantId: string, filters: { username?: string; from?: string; to?: string; page?: number; limit?: number }) {
    const page = filters.page || 1;
    const limit = filters.limit || 50;

    const qb = this.radacctRepo.createQueryBuilder('r')
      .leftJoin(NasDevice, 'n', 'n.id = r.nas_id')
      .select([
        'r.id AS id',
        'r.username AS username',
        'r.start_time AS "startTime"',
        'r.stop_time AS "stopTime"',
        'r.session_time AS "sessionTime"',
        'r.output_octets AS "outputOctets"',
        'r.output_gigawords AS "outputGigawords"',
        'r.input_octets AS "inputOctets"',
        'r.input_gigawords AS "inputGigawords"',
        'r.framed_ip AS "framedIp"',
        'r.nas_ip AS "nasIp"',
        'n.name AS "nasName"',
      ])
      .where('r.tenant_id = :tenantId', { tenantId });

    if (filters.username) qb.andWhere('r.username ILIKE :username', { username: `%${filters.username}%` });
    if (filters.from) qb.andWhere('r.start_time >= :from', { from: filters.from });
    if (filters.to) qb.andWhere('r.start_time <= :to', { to: filters.to });

    const total = await qb.getCount();
    const data = await qb
      .orderBy('r.start_time', 'DESC')
      .offset((page - 1) * limit)
      .limit(limit)
      .getRawMany();

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async authLog(tenantId: string, filters: { username?: string; reply?: string; from?: string; to?: string; page?: number; limit?: number }) {
    const page = filters.page || 1;
    const limit = filters.limit || 50;

    const qb = this.authRepo.createQueryBuilder('a')
      .select([
        'a.id AS id',
        'a.username AS username',
        'a.reply AS reply',
        'a.nas_ip AS "nasIp"',
        'a.calling_station AS "callingStation"',
        'a.auth_date AS "authDate"',
      ])
      .where('a.tenant_id = :tenantId', { tenantId });

    if (filters.username) qb.andWhere('a.username ILIKE :username', { username: `%${filters.username}%` });
    if (filters.reply) qb.andWhere('a.reply = :reply', { reply: filters.reply });
    if (filters.from) qb.andWhere('a.auth_date >= :from', { from: filters.from });
    if (filters.to) qb.andWhere('a.auth_date <= :to', { to: filters.to });

    const total = await qb.getCount();
    const data = await qb
      .orderBy('a.auth_date', 'DESC')
      .offset((page - 1) * limit)
      .limit(limit)
      .getRawMany();

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async systemStats(tenantId: string) {
    const totalSubscribers = await this.subRepo.count({ where: { tenantId } });
    const activeSubscribers = await this.subRepo.count({ where: { tenantId, status: 'active', enabled: true } });
    const onlineSessions = await this.radacctRepo.count({ where: { tenantId, stopTime: IsNull() } });
    const totalNas = await this.nasRepo.count({ where: { tenantId } });
    const totalGroups = await this.groupRepo.count({ where: { tenantId } });

    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const todaySessions = await this.radacctRepo.createQueryBuilder('r')
      .where('r.tenant_id = :tenantId AND r.start_time >= :today', { tenantId, today: todayStart })
      .getCount();

    const todayTraffic = await this.radacctRepo.createQueryBuilder('r')
      .select('SUM(r.output_octets + r.output_gigawords * 4294967296)', 'totalDownload')
      .addSelect('SUM(r.input_octets + r.input_gigawords * 4294967296)', 'totalUpload')
      .where('r.tenant_id = :tenantId AND r.start_time >= :today', { tenantId, today: todayStart })
      .getRawOne();

    const totalAuthAttempts = await this.authRepo.count({ where: { tenantId } });
    const totalAuthFailures = await this.authRepo.count({ where: { tenantId, reply: 'Access-Reject' } });

    return {
      totalSubscribers, activeSubscribers, onlineSessions, totalNas, totalGroups,
      todaySessions,
      todayDownload: todayTraffic?.totalDownload || 0,
      todayUpload: todayTraffic?.totalUpload || 0,
      totalAuthAttempts, totalAuthFailures,
    };
  }

  async getSyslog(tenantId: string, level?: string, limit = 200) {
    const where: any = { tenantId };
    if (level) where.level = level;
    return this.syslogRepo.find({ where, order: { createdAt: 'DESC' }, take: limit });
  }

  async logEvent(tenantId: string, level: string, source: string, message: string, metadata?: any) {
    const entry = this.syslogRepo.create({ tenantId, level, source, message, metadata: metadata || {} });
    return this.syslogRepo.save(entry);
  }

  async dashboard(tenantId: string) {
    const stats = await this.subscriberStats(tenantId);
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const todayRevenue = await this.invoiceRepo.createQueryBuilder('i')
      .select('SUM(i.gross_price)', 'total')
      .where('i.tenant_id = :tenantId AND i.created_at >= :today', { tenantId, today: todayStart })
      .getRawOne();
    const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
    const monthRevenue = await this.invoiceRepo.createQueryBuilder('i')
      .select('SUM(i.gross_price)', 'total')
      .where('i.tenant_id = :tenantId AND i.created_at >= :month', { tenantId, month: monthStart })
      .getRawOne();
    return {
      subscribers: stats,
      todayRevenue: todayRevenue?.total || 0,
      monthRevenue: monthRevenue?.total || 0,
    };
  }
}

@ApiTags('reports') @ApiBearerAuth() @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard) @Roles('admin', 'manager')
@Controller('reports')
export class ReportsController {
  constructor(private readonly service: ReportsService) {}

  @Get('dashboard') @Permissions('dashboard') @ApiOperation({ summary: 'Dashboard overview' })
  dashboard(@TenantId() tid: string) { return this.service.dashboard(tid); }

  @Get('traffic') @Permissions('traffic_report') @ApiOperation({ summary: 'Traffic summary report' })
  traffic(@TenantId() tid: string, @Query('from') from: string, @Query('to') to: string) {
    return this.service.trafficSummary(tid, from, to);
  }

  @Get('top-users') @Permissions('traffic_report') @ApiOperation({ summary: 'Top users by traffic' })
  topUsers(@TenantId() tid: string, @Query('limit') limit: number) {
    return this.service.topUsers(tid, limit || 20);
  }

  @Get('auth-failures') @Permissions('connection_report') @ApiOperation({ summary: 'Auth failure log' })
  authFailures(@TenantId() tid: string, @Query('limit') limit: number) {
    return this.service.authFailures(tid, limit || 100);
  }

  @Get('revenue') @Permissions('billing') @ApiOperation({ summary: 'Revenue report' })
  revenue(@TenantId() tid: string, @Query('from') from: string, @Query('to') to: string) {
    return this.service.revenueSummary(tid, from, to);
  }

  @Get('subscriber-stats') @Permissions('dashboard') @ApiOperation({ summary: 'Subscriber statistics' })
  subscriberStats(@TenantId() tid: string) { return this.service.subscriberStats(tid); }

  @Get('online-radius-users') @Permissions('online_users') @ApiOperation({ summary: 'Online RADIUS users with filters' })
  onlineRadiusUsers(
    @TenantId() tid: string,
    @Query('nasId') nasId: string,
    @Query('ap') ap: string,
    @Query('groupId') groupId: string,
    @Query('username') username: string,
    @Query('page') page: number,
    @Query('limit') limit: number,
  ) {
    return this.service.onlineRadiusUsers(tid, { nasId, ap, groupId, username, page: page || 1, limit: limit || 50 });
  }

  @Get('connection-report') @Permissions('connection_report') @ApiOperation({ summary: 'Connection report (closed sessions)' })
  connectionReport(
    @TenantId() tid: string,
    @Query('nasId') nasId: string,
    @Query('username') username: string,
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('page') page: number,
    @Query('limit') limit: number,
  ) {
    return this.service.connectionReport(tid, { nasId, username, from, to, page: page || 1, limit: limit || 50 });
  }

  @Get('daily-traffic') @Permissions('traffic_report') @ApiOperation({ summary: 'Daily traffic report' })
  dailyTraffic(
    @TenantId() tid: string,
    @Query('nasId') nasId: string,
    @Query('username') username: string,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    return this.service.dailyTrafficReport(tid, { nasId, username, from, to });
  }

  @Get('find-traffic') @Permissions('traffic_report') @ApiOperation({ summary: 'Find traffic data' })
  findTraffic(
    @TenantId() tid: string,
    @Query('username') username: string,
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('page') page: number,
    @Query('limit') limit: number,
  ) {
    return this.service.findTrafficData(tid, { username, from, to, page: page || 1, limit: limit || 50 });
  }

  @Get('auth-log') @Permissions('connection_report') @ApiOperation({ summary: 'Authentication log with filters' })
  authLog(
    @TenantId() tid: string,
    @Query('username') username: string,
    @Query('reply') reply: string,
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('page') page: number,
    @Query('limit') limit: number,
  ) {
    return this.service.authLog(tid, { username, reply, from, to, page: page || 1, limit: limit || 50 });
  }

  @Get('system-stats') @Permissions('dashboard') @ApiOperation({ summary: 'System statistics' })
  systemStats(@TenantId() tid: string) { return this.service.systemStats(tid); }

  @Get('syslog') @Permissions('sys_log') @ApiOperation({ summary: 'System log' })
  syslog(@TenantId() tid: string, @Query('level') level: string, @Query('limit') limit: number) {
    return this.service.getSyslog(tid, level, limit || 200);
  }
}

@Module({
  imports: [TypeOrmModule.forFeature([Radacct, Radpostauth, Subscriber, Invoice, SyslogEntry, NasDevice, UserGroup])],
  controllers: [ReportsController],
  providers: [ReportsService],
  exports: [ReportsService],
})
export class ReportsModule {}
