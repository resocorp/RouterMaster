import { Module, Injectable, NotFoundException, Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { TypeOrmModule, InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AccessPoint } from './entities/access-point.entity';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { TenantId } from '../../common/decorators/tenant-id.decorator';

@Injectable()
export class AccessPointsService {
  constructor(@InjectRepository(AccessPoint) private readonly repo: Repository<AccessPoint>) {}
  findAll(tenantId: string) { return this.repo.find({ where: { tenantId }, order: { name: 'ASC' } }); }
  async findOne(id: string, tenantId: string) {
    const ap = await this.repo.findOne({ where: { id, tenantId } });
    if (!ap) throw new NotFoundException('Access point not found');
    return ap;
  }
  create(tenantId: string, dto: Partial<AccessPoint>) { return this.repo.save(this.repo.create({ ...dto, tenantId })); }
  async update(id: string, tenantId: string, dto: Partial<AccessPoint>) {
    const ap = await this.findOne(id, tenantId); Object.assign(ap, dto); return this.repo.save(ap);
  }
  async remove(id: string, tenantId: string) { const ap = await this.findOne(id, tenantId); await this.repo.remove(ap); }
}

@ApiTags('access-points') @ApiBearerAuth() @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard) @Roles('admin', 'manager')
@Controller('access-points')
export class AccessPointsController {
  constructor(private readonly service: AccessPointsService) {}
  @Get() @Permissions('list_ap') @ApiOperation({ summary: 'List access points' })
  findAll(@TenantId() tid: string) { return this.service.findAll(tid); }
  @Post() @Permissions('register_ap') @ApiOperation({ summary: 'Create access point' })
  create(@TenantId() tid: string, @Body() dto: any) { return this.service.create(tid, dto); }
  @Get(':id') @Permissions('list_ap') @ApiOperation({ summary: 'Get access point' })
  findOne(@Param('id') id: string, @TenantId() tid: string) { return this.service.findOne(id, tid); }
  @Put(':id') @Permissions('edit_ap') @ApiOperation({ summary: 'Update access point' })
  update(@Param('id') id: string, @TenantId() tid: string, @Body() dto: any) { return this.service.update(id, tid, dto); }
  @Delete(':id') @Permissions('delete_ap') @ApiOperation({ summary: 'Delete access point' })
  remove(@Param('id') id: string, @TenantId() tid: string) { return this.service.remove(id, tid); }
}

@Module({
  imports: [TypeOrmModule.forFeature([AccessPoint])],
  controllers: [AccessPointsController],
  providers: [AccessPointsService],
  exports: [AccessPointsService],
})
export class AccessPointsModule {}
