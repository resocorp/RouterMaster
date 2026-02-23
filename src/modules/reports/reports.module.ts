import { Module, Injectable, Controller, Get, Query, UseGuards, Logger } from '@nestjs/common';
import { TypeOrmModule, InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, Between } from 'typeorm';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Radacct } from '../radius/entities/radacct.entity';
import { Radpostauth } from '../radius/entities/radpostauth.entity';
import { Subscriber } from '../subscribers/entities/subscriber.entity';
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

  @Get('syslog') @Permissions('sys_log') @ApiOperation({ summary: 'System log' })
  syslog(@TenantId() tid: string, @Query('level') level: string, @Query('limit') limit: number) {
    return this.service.getSyslog(tid, level, limit || 200);
  }
}

@Module({
  imports: [TypeOrmModule.forFeature([Radacct, Radpostauth, Subscriber, Invoice, SyslogEntry])],
  controllers: [ReportsController],
  providers: [ReportsService],
  exports: [ReportsService],
})
export class ReportsModule {}
