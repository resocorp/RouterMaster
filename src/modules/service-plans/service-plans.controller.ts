import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ServicePlansService } from './service-plans.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { TenantId } from '../../common/decorators/tenant-id.decorator';

@ApiTags('service-plans')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles('admin', 'manager')
@Controller('service-plans')
export class ServicePlansController {
  constructor(private readonly service: ServicePlansService) {}

  @Get() @Permissions('list_services') @ApiOperation({ summary: 'List all service plans' })
  findAll(@TenantId() tenantId: string) { return this.service.findAll(tenantId); }

  @Post() @Permissions('register_services') @ApiOperation({ summary: 'Create service plan' })
  create(@TenantId() tenantId: string, @Body() dto: any) { return this.service.create(tenantId, dto); }

  @Get(':id') @Permissions('list_services') @ApiOperation({ summary: 'Get service plan' })
  findOne(@Param('id') id: string, @TenantId() tenantId: string) { return this.service.findOne(id, tenantId); }

  @Put(':id') @Permissions('edit_services') @ApiOperation({ summary: 'Update service plan' })
  update(@Param('id') id: string, @TenantId() tenantId: string, @Body() dto: any) { return this.service.update(id, tenantId, dto); }

  @Delete(':id') @Permissions('delete_services') @ApiOperation({ summary: 'Delete service plan' })
  remove(@Param('id') id: string, @TenantId() tenantId: string) { return this.service.remove(id, tenantId); }

  @Get(':id/special-accounting') @Permissions('list_services') @ApiOperation({ summary: 'Get special accounting rules' })
  getSpecialAccounting(@Param('id') id: string, @TenantId() tenantId: string) { return this.service.getSpecialAccounting(id, tenantId); }

  @Put(':id/special-accounting') @Permissions('edit_services') @ApiOperation({ summary: 'Update special accounting rules' })
  updateSpecialAccounting(@Param('id') id: string, @TenantId() tenantId: string, @Body() body: any[]) { return this.service.updateSpecialAccounting(id, tenantId, body); }

  @Get(':id/dynamic-rates') @Permissions('list_services') @ApiOperation({ summary: 'Get dynamic rate rules' })
  getDynamicRates(@Param('id') id: string, @TenantId() tenantId: string) { return this.service.getDynamicRates(id, tenantId); }

  @Put(':id/dynamic-rates') @Permissions('edit_services') @ApiOperation({ summary: 'Update dynamic rate rules' })
  updateDynamicRates(@Param('id') id: string, @TenantId() tenantId: string, @Body() body: any[]) { return this.service.updateDynamicRates(id, tenantId, body); }

  @Post('bulk/enable') @Permissions('edit_services') @ApiOperation({ summary: 'Bulk enable plans' })
  bulkEnable(@TenantId() tenantId: string, @Body() body: { ids: string[] }) { return this.service.bulkEnable(body.ids, tenantId); }

  @Post('bulk/disable') @Permissions('edit_services') @ApiOperation({ summary: 'Bulk disable plans' })
  bulkDisable(@TenantId() tenantId: string, @Body() body: { ids: string[] }) { return this.service.bulkDisable(body.ids, tenantId); }
}
