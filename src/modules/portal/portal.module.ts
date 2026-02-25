import { Module, Injectable, Controller, Get, Post, Put, Body, UseGuards, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { TypeOrmModule, InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import * as bcrypt from 'bcrypt';
import { Subscriber } from '../subscribers/entities/subscriber.entity';
import { ServicePlan } from '../service-plans/entities/service-plan.entity';
import { Invoice } from '../billing/entities/invoice.entity';
import { Radacct } from '../radius/entities/radacct.entity';
import { Card } from '../cards/entities/card.entity';
import { CardSeries } from '../cards/entities/card-series.entity';
import { SystemSettings } from '../settings/entities/system-settings.entity';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { TenantId } from '../../common/decorators/tenant-id.decorator';

@Injectable()
export class PortalService {
  private readonly logger = new Logger(PortalService.name);

  constructor(
    @InjectRepository(Subscriber) private readonly subRepo: Repository<Subscriber>,
    @InjectRepository(ServicePlan) private readonly planRepo: Repository<ServicePlan>,
    @InjectRepository(Invoice) private readonly invoiceRepo: Repository<Invoice>,
    @InjectRepository(Radacct) private readonly radacctRepo: Repository<Radacct>,
    @InjectRepository(Card) private readonly cardRepo: Repository<Card>,
    @InjectRepository(CardSeries) private readonly seriesRepo: Repository<CardSeries>,
    @InjectRepository(SystemSettings) private readonly settingsRepo: Repository<SystemSettings>,
  ) {}

  async getMyProfile(userId: string, tenantId: string) {
    const sub = await this.subRepo.findOne({ where: { id: userId, tenantId }, relations: ['plan', 'group'] });
    if (!sub) throw new NotFoundException('User not found');
    const { passwordHash, ...result } = sub;
    return result;
  }

  async updateMyProfile(userId: string, tenantId: string, dto: any) {
    const sub = await this.subRepo.findOne({ where: { id: userId, tenantId } });
    if (!sub) throw new NotFoundException('User not found');
    const settings = await this.settingsRepo.findOne({ where: { tenantId } });
    if (!settings?.ucpEditData) throw new BadRequestException('Profile editing is disabled');
    const allowed = ['firstName', 'lastName', 'email', 'phone', 'mobile', 'address', 'city', 'zip', 'country', 'language'];
    for (const key of allowed) { if (dto[key] !== undefined) (sub as any)[key] = dto[key]; }
    return this.subRepo.save(sub);
  }

  async changePassword(userId: string, tenantId: string, oldPassword: string, newPassword: string) {
    const sub = await this.subRepo.findOne({ where: { id: userId, tenantId } });
    if (!sub) throw new NotFoundException('User not found');
    const settings = await this.settingsRepo.findOne({ where: { tenantId } });
    if (!settings?.ucpChangePassword) throw new BadRequestException('Password change disabled');
    const valid = sub.passwordPlain ? (oldPassword === sub.passwordPlain) : await bcrypt.compare(oldPassword, sub.passwordHash);
    if (!valid) throw new BadRequestException('Current password is incorrect');
    sub.passwordHash = newPassword;
    sub.passwordPlain = newPassword;
    await this.subRepo.save(sub);
    return { success: true };
  }

  async redeemVoucher(userId: string, tenantId: string, pin: string) {
    const sub = await this.subRepo.findOne({ where: { id: userId, tenantId } });
    if (!sub) throw new NotFoundException('User not found');
    const settings = await this.settingsRepo.findOne({ where: { tenantId } });
    if (!settings?.ucpRedeemVoucher) throw new BadRequestException('Voucher redemption disabled');

    const card = await this.cardRepo.findOne({ where: { pin, tenantId, status: 'active' } });
    if (!card) throw new NotFoundException('Invalid or used voucher');
    const series = await this.seriesRepo.findOne({ where: { id: card.seriesId } });
    if (!series) throw new NotFoundException('Card series not found');
    if (series.validTill && new Date(series.validTill) < new Date()) throw new BadRequestException('Voucher expired');

    card.status = 'used';
    card.activatedBy = userId;
    card.activatedAt = new Date();
    await this.cardRepo.save(card);
    this.logger.log(`Voucher ${pin} redeemed by ${sub.username}`);
    return { success: true, message: 'Voucher redeemed' };
  }

  async getMyInvoices(userId: string, tenantId: string) {
    return this.invoiceRepo.find({ where: { subscriberId: userId, tenantId }, order: { createdAt: 'DESC' }, take: 50 });
  }

  async getMyUsage(userId: string, tenantId: string) {
    const sub = await this.subRepo.findOne({ where: { id: userId, tenantId } });
    if (!sub) throw new NotFoundException('User not found');
    return this.radacctRepo.createQueryBuilder('r')
      .select("DATE_TRUNC('day', r.start_time)", 'date')
      .addSelect('SUM(r.output_octets + r.output_gigawords * 4294967296)', 'download')
      .addSelect('SUM(r.input_octets + r.input_gigawords * 4294967296)', 'upload')
      .addSelect('SUM(r.session_time)', 'time')
      .where('r.username = :username AND r.tenant_id = :tenantId', { username: sub.username, tenantId })
      .groupBy("DATE_TRUNC('day', r.start_time)")
      .orderBy('date', 'DESC').limit(30).getRawMany();
  }

  async getAvailablePlans(tenantId: string) {
    return this.planRepo.find({ where: { tenantId, enabled: true, availableUcp: true }, order: { name: 'ASC' } });
  }
}

@ApiTags('portal') @ApiBearerAuth() @UseGuards(JwtAuthGuard, RolesGuard) @Roles('subscriber')
@Controller('portal')
export class PortalController {
  constructor(private readonly service: PortalService) {}

  @Get('profile') @ApiOperation({ summary: 'Get my profile' })
  getProfile(@CurrentUser() u: JwtPayload, @TenantId() tid: string) { return this.service.getMyProfile(u.sub, tid); }

  @Put('profile') @ApiOperation({ summary: 'Update my profile' })
  updateProfile(@CurrentUser() u: JwtPayload, @TenantId() tid: string, @Body() dto: any) { return this.service.updateMyProfile(u.sub, tid, dto); }

  @Post('change-password') @ApiOperation({ summary: 'Change my password' })
  changePassword(@CurrentUser() u: JwtPayload, @TenantId() tid: string, @Body() body: { oldPassword: string; newPassword: string }) {
    return this.service.changePassword(u.sub, tid, body.oldPassword, body.newPassword);
  }

  @Post('redeem-voucher') @ApiOperation({ summary: 'Redeem a voucher/card' })
  redeemVoucher(@CurrentUser() u: JwtPayload, @TenantId() tid: string, @Body() body: { pin: string }) {
    return this.service.redeemVoucher(u.sub, tid, body.pin);
  }

  @Get('invoices') @ApiOperation({ summary: 'My invoices' })
  getInvoices(@CurrentUser() u: JwtPayload, @TenantId() tid: string) { return this.service.getMyInvoices(u.sub, tid); }

  @Get('usage') @ApiOperation({ summary: 'My traffic usage' })
  getUsage(@CurrentUser() u: JwtPayload, @TenantId() tid: string) { return this.service.getMyUsage(u.sub, tid); }

  @Get('plans') @ApiOperation({ summary: 'Available plans for self-service' })
  getPlans(@TenantId() tid: string) { return this.service.getAvailablePlans(tid); }
}

@Module({
  imports: [TypeOrmModule.forFeature([Subscriber, ServicePlan, Invoice, Radacct, Card, CardSeries, SystemSettings])],
  controllers: [PortalController],
  providers: [PortalService],
  exports: [PortalService],
})
export class PortalModule {}
