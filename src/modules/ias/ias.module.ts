import { Module, Injectable, NotFoundException, Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Logger } from '@nestjs/common';
import { TypeOrmModule, InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { IasTemplate } from './entities/ias-template.entity';
import { Subscriber } from '../subscribers/entities/subscriber.entity';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { TenantId } from '../../common/decorators/tenant-id.decorator';
import { CreateIasTemplateDto, UpdateIasTemplateDto, ActivateIasDto } from './dto/ias.dto';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class IasService {
  private readonly logger = new Logger(IasService.name);

  constructor(
    @InjectRepository(IasTemplate) private readonly templateRepo: Repository<IasTemplate>,
    @InjectRepository(Subscriber) private readonly subRepo: Repository<Subscriber>,
  ) {}

  findAll(tenantId: string) { return this.templateRepo.find({ where: { tenantId }, order: { name: 'ASC' } }); }

  async findOne(id: string, tenantId: string) {
    const t = await this.templateRepo.findOne({ where: { id, tenantId } });
    if (!t) throw new NotFoundException('IAS template not found');
    return t;
  }

  create(tenantId: string, dto: any) {
    return this.templateRepo.save(this.templateRepo.create({ ...dto, tenantId }));
  }

  async update(id: string, tenantId: string, dto: any) {
    const t = await this.findOne(id, tenantId);
    Object.assign(t, dto);
    return this.templateRepo.save(t);
  }

  async remove(id: string, tenantId: string) {
    const t = await this.findOne(id, tenantId);
    await this.templateRepo.remove(t);
  }

  async activateIas(templateId: string, tenantId: string, macAddress: string) {
    const template = await this.findOne(templateId, tenantId);

    const username = macAddress.replace(/[:-]/g, '').toLowerCase();
    const password = crypto.randomBytes(4).toString('hex');
    const passwordHash = await bcrypt.hash(password, 10);

    let subscriber = await this.subRepo.findOne({ where: { username, tenantId } });
    if (!subscriber) {
      subscriber = this.subRepo.create({
        tenantId, username, passwordHash,
        accountType: 'ias', status: 'active', enabled: true,
        macCpe: macAddress, planId: template.planId,
        dlLimitBytes: (BigInt(template.dlLimitMb) * 1048576n).toString(),
        ulLimitBytes: (BigInt(template.ulLimitMb) * 1048576n).toString(),
        totalLimitBytes: (BigInt(template.totalLimitMb) * 1048576n).toString(),
        timeLimitSecs: template.timeLimitSecs,
        simUse: template.simUse,
      });

      if (template.expiryMode === 'from_activation') {
        const expiry = new Date();
        expiry.setSeconds(expiry.getSeconds() + template.activationTimeSecs);
        subscriber.expiryDate = expiry;
      } else if (template.expiryDate) {
        subscriber.expiryDate = template.expiryDate;
      }

      await this.subRepo.save(subscriber);
      this.logger.log(`IAS account created: ${username}`);
    }

    return { username, password, expiryDate: subscriber.expiryDate };
  }
}

@ApiTags('ias') @ApiBearerAuth() @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard) @Roles('admin', 'manager')
@Controller('ias')
export class IasController {
  constructor(private readonly service: IasService) {}

  @Get('templates') @Permissions('list_ias') @ApiOperation({ summary: 'List IAS templates' })
  findAll(@TenantId() tid: string) { return this.service.findAll(tid); }

  @Post('templates') @Permissions('register_ias') @ApiOperation({ summary: 'Create IAS template' })
  create(@TenantId() tid: string, @Body() dto: CreateIasTemplateDto) { return this.service.create(tid, dto); }

  @Get('templates/:id') @Permissions('list_ias') @ApiOperation({ summary: 'Get IAS template' })
  findOne(@Param('id') id: string, @TenantId() tid: string) { return this.service.findOne(id, tid); }

  @Put('templates/:id') @Permissions('edit_ias') @ApiOperation({ summary: 'Update IAS template' })
  update(@Param('id') id: string, @TenantId() tid: string, @Body() dto: UpdateIasTemplateDto) { return this.service.update(id, tid, dto); }

  @Delete('templates/:id') @Permissions('delete_ias') @ApiOperation({ summary: 'Delete IAS template' })
  remove(@Param('id') id: string, @TenantId() tid: string) { return this.service.remove(id, tid); }

  @Post('activate') @ApiOperation({ summary: 'Activate IAS session from MAC' })
  activate(@TenantId() tid: string, @Body() body: ActivateIasDto) {
    return this.service.activateIas(body.templateId, tid, body.macAddress);
  }
}

@Module({
  imports: [TypeOrmModule.forFeature([IasTemplate, Subscriber])],
  controllers: [IasController],
  providers: [IasService],
  exports: [IasService],
})
export class IasModule {}
