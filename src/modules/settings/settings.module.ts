import { Module, Injectable, NotFoundException, Controller, Get, Put, Body, UseGuards } from '@nestjs/common';
import { TypeOrmModule, InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Tenant } from './entities/tenant.entity';
import { UpdateTenantDto, UpdateSystemSettingsDto } from './dto/settings.dto';
import { SystemSettings } from './entities/system-settings.entity';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { TenantId } from '../../common/decorators/tenant-id.decorator';

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(Tenant) private readonly tenantRepo: Repository<Tenant>,
    @InjectRepository(SystemSettings) private readonly settingsRepo: Repository<SystemSettings>,
  ) {}

  async getTenant(tenantId: string) {
    const t = await this.tenantRepo.findOne({ where: { id: tenantId } });
    if (!t) throw new NotFoundException('Tenant not found');
    return t;
  }

  async updateTenant(tenantId: string, dto: Partial<Tenant>) {
    const t = await this.getTenant(tenantId);
    Object.assign(t, dto);
    return this.tenantRepo.save(t);
  }

  async getSettings(tenantId: string) {
    let s = await this.settingsRepo.findOne({ where: { tenantId } });
    if (!s) {
      s = this.settingsRepo.create({ tenantId });
      await this.settingsRepo.save(s);
    }
    return s;
  }

  async updateSettings(tenantId: string, dto: Partial<SystemSettings>) {
    let s = await this.settingsRepo.findOne({ where: { tenantId } });
    if (!s) {
      s = this.settingsRepo.create({ tenantId, ...dto });
    } else {
      Object.assign(s, dto);
    }
    return this.settingsRepo.save(s);
  }
}

@ApiTags('settings') @ApiBearerAuth() @UseGuards(JwtAuthGuard, RolesGuard) @Roles('admin')
@Controller('settings')
export class SettingsController {
  constructor(private readonly service: SettingsService) {}

  @Get('tenant') @ApiOperation({ summary: 'Get tenant info' })
  getTenant(@TenantId() tid: string) { return this.service.getTenant(tid); }

  @Put('tenant') @ApiOperation({ summary: 'Update tenant info' })
  updateTenant(@TenantId() tid: string, @Body() dto: UpdateTenantDto) { return this.service.updateTenant(tid, dto); }

  @Get() @ApiOperation({ summary: 'Get system settings' })
  getSettings(@TenantId() tid: string) { return this.service.getSettings(tid); }

  @Put() @ApiOperation({ summary: 'Update system settings' })
  updateSettings(@TenantId() tid: string, @Body() dto: UpdateSystemSettingsDto) { return this.service.updateSettings(tid, dto); }
}

@Module({
  imports: [TypeOrmModule.forFeature([Tenant, SystemSettings])],
  controllers: [SettingsController],
  providers: [SettingsService],
  exports: [SettingsService],
})
export class SettingsModule {}
