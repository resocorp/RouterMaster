import { Module, Injectable, NotFoundException, Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Logger } from '@nestjs/common';
import { TypeOrmModule, InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { NotificationTemplate } from './entities/notification-template.entity';
import { Subscriber } from '../subscribers/entities/subscriber.entity';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { TenantId } from '../../common/decorators/tenant-id.decorator';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(NotificationTemplate) private readonly templateRepo: Repository<NotificationTemplate>,
    @InjectRepository(Subscriber) private readonly subRepo: Repository<Subscriber>,
    private readonly configService: ConfigService,
  ) {}

  async getTemplates(tenantId: string) {
    return this.templateRepo.find({ where: { tenantId }, order: { slug: 'ASC' } });
  }

  async getTemplate(id: string, tenantId: string) {
    const t = await this.templateRepo.findOne({ where: { id, tenantId } });
    if (!t) throw new NotFoundException('Template not found');
    return t;
  }

  async upsertTemplate(tenantId: string, dto: Partial<NotificationTemplate>) {
    const existing = await this.templateRepo.findOne({ where: { slug: dto.slug, channel: dto.channel, tenantId } });
    if (existing) {
      Object.assign(existing, dto);
      return this.templateRepo.save(existing);
    }
    return this.templateRepo.save(this.templateRepo.create({ ...dto, tenantId }));
  }

  async deleteTemplate(id: string, tenantId: string) {
    const t = await this.getTemplate(id, tenantId);
    await this.templateRepo.remove(t);
  }

  async sendEmail(to: string, subject: string, body: string): Promise<boolean> {
    try {
      const nodemailer = require('nodemailer');
      const transporter = nodemailer.createTransport({
        host: this.configService.get('SMTP_HOST', 'localhost'),
        port: this.configService.get('SMTP_PORT', 587),
        secure: this.configService.get('SMTP_SECURE', 'false') === 'true',
        auth: {
          user: this.configService.get('SMTP_USER', ''),
          pass: this.configService.get('SMTP_PASS', ''),
        },
      });
      await transporter.sendMail({
        from: this.configService.get('SMTP_FROM', 'noreply@radiusnexus.com'),
        to, subject, html: body,
      });
      this.logger.log(`Email sent to ${to}: ${subject}`);
      return true;
    } catch (err) {
      this.logger.error(`Email failed to ${to}: ${err.message}`);
      return false;
    }
  }

  async sendSms(phone: string, message: string): Promise<boolean> {
    const provider = this.configService.get('SMS_PROVIDER', 'twilio');
    try {
      if (provider === 'twilio') {
        const accountSid = this.configService.get('TWILIO_SID');
        const authToken = this.configService.get('TWILIO_AUTH_TOKEN');
        const fromNumber = this.configService.get('TWILIO_FROM');
        if (!accountSid || !authToken) {
          this.logger.warn('Twilio credentials not configured');
          return false;
        }
        const twilio = require('twilio')(accountSid, authToken);
        await twilio.messages.create({ body: message, from: fromNumber, to: phone });
      }
      this.logger.log(`SMS sent to ${phone}`);
      return true;
    } catch (err) {
      this.logger.error(`SMS failed to ${phone}: ${err.message}`);
      return false;
    }
  }

  renderTemplate(body: string, vars: Record<string, string>): string {
    let rendered = body;
    for (const [key, val] of Object.entries(vars)) {
      rendered = rendered.replace(new RegExp(`{{${key}}}`, 'g'), val);
    }
    return rendered;
  }

  async notifySubscriber(subscriberId: string, tenantId: string, slug: string, vars: Record<string, string>) {
    const sub = await this.subRepo.findOne({ where: { id: subscriberId, tenantId } });
    if (!sub) return;

    const templates = await this.templateRepo.find({ where: { slug, tenantId } });
    for (const tpl of templates) {
      const rendered = this.renderTemplate(tpl.body, { ...vars, username: sub.username, firstName: sub.firstName || '', lastName: sub.lastName || '' });
      if (tpl.channel === 'email' && sub.email && sub.emailAlerts) {
        const subject = this.renderTemplate(tpl.subject || slug, vars);
        await this.sendEmail(sub.email, subject, rendered);
      } else if (tpl.channel === 'sms' && sub.mobile && sub.smsAlerts) {
        await this.sendSms(sub.mobile, rendered);
      }
    }
  }
}

@ApiTags('notifications') @ApiBearerAuth() @UseGuards(JwtAuthGuard, RolesGuard) @Roles('admin')
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  @Get('templates') @ApiOperation({ summary: 'List notification templates' })
  getTemplates(@TenantId() tid: string) { return this.service.getTemplates(tid); }

  @Get('templates/:id') @ApiOperation({ summary: 'Get template' })
  getTemplate(@Param('id') id: string, @TenantId() tid: string) { return this.service.getTemplate(id, tid); }

  @Post('templates') @ApiOperation({ summary: 'Create/update template' })
  upsertTemplate(@TenantId() tid: string, @Body() dto: any) { return this.service.upsertTemplate(tid, dto); }

  @Delete('templates/:id') @ApiOperation({ summary: 'Delete template' })
  deleteTemplate(@Param('id') id: string, @TenantId() tid: string) { return this.service.deleteTemplate(id, tid); }

  @Post('send-test') @ApiOperation({ summary: 'Send test notification' })
  async sendTest(@Body() body: { type: string; to: string; subject?: string; message: string }) {
    if (body.type === 'email') return { sent: await this.service.sendEmail(body.to, body.subject || 'Test', body.message) };
    if (body.type === 'sms') return { sent: await this.service.sendSms(body.to, body.message) };
    return { sent: false, error: 'Unknown type' };
  }
}

@Module({
  imports: [TypeOrmModule.forFeature([NotificationTemplate, Subscriber])],
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
