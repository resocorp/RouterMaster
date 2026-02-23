import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { SubscribersService } from './subscribers.service';
import { CreateSubscriberDto } from './dto/create-subscriber.dto';
import { AddCreditsDto, AddDepositDto, ChangeServiceDto, FilterSubscribersDto } from './dto/add-credits.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { TenantId } from '../../common/decorators/tenant-id.decorator';

@ApiTags('subscribers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles('admin', 'manager')
@Controller('subscribers')
export class SubscribersController {
  constructor(private readonly service: SubscribersService) {}

  @Get()
  @Permissions('list_users')
  @ApiOperation({ summary: 'List subscribers (paginated, filterable)' })
  findAll(@TenantId() tenantId: string, @Query() filters: FilterSubscribersDto) {
    return this.service.findAll(tenantId, filters);
  }

  @Post()
  @Permissions('register_users')
  @ApiOperation({ summary: 'Create subscriber' })
  create(@TenantId() tenantId: string, @Body() dto: CreateSubscriberDto) {
    return this.service.create(tenantId, dto);
  }

  @Get(':id')
  @Permissions('list_users')
  @ApiOperation({ summary: 'Get subscriber by ID' })
  findOne(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.service.findOne(id, tenantId);
  }

  @Put(':id')
  @Permissions('edit_users')
  @ApiOperation({ summary: 'Update subscriber' })
  update(@Param('id') id: string, @TenantId() tenantId: string, @Body() dto: Partial<CreateSubscriberDto>) {
    return this.service.update(id, tenantId, dto);
  }

  @Delete(':id')
  @Permissions('delete_users')
  @ApiOperation({ summary: 'Delete subscriber' })
  remove(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.service.remove(id, tenantId);
  }

  @Post(':id/add-credits')
  @Permissions('billing')
  @ApiOperation({ summary: 'Add prepaid credits' })
  addCredits(@Param('id') id: string, @TenantId() tenantId: string, @Body() dto: AddCreditsDto, @CurrentUser() user: JwtPayload) {
    return this.service.addCredits(id, tenantId, dto, user.sub);
  }

  @Post(':id/add-deposit')
  @Permissions('billing')
  @ApiOperation({ summary: 'Add to internal balance' })
  addDeposit(@Param('id') id: string, @TenantId() tenantId: string, @Body() dto: AddDepositDto) {
    return this.service.addDeposit(id, tenantId, dto);
  }

  @Post(':id/change-service')
  @Permissions('edit_users')
  @ApiOperation({ summary: 'Change service plan' })
  changeService(@Param('id') id: string, @TenantId() tenantId: string, @Body() dto: ChangeServiceDto, @CurrentUser() user: JwtPayload) {
    return this.service.changeService(id, tenantId, dto, user.sub);
  }

  @Get(':id/traffic')
  @Permissions('traffic_report')
  @ApiOperation({ summary: 'Get traffic report' })
  getTraffic(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.service.getTraffic(id, tenantId);
  }

  @Get(':id/auth-log')
  @Permissions('connection_report')
  @ApiOperation({ summary: 'Get auth attempt log' })
  getAuthLog(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.service.getAuthLog(id, tenantId);
  }

  @Get(':id/invoices')
  @Permissions('access_invoices')
  @ApiOperation({ summary: 'Get invoice history' })
  getInvoices(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.service.getInvoices(id, tenantId);
  }

  @Get(':id/service-history')
  @Permissions('list_users')
  @ApiOperation({ summary: 'Get service plan change history' })
  getServiceHistory(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.service.getServiceHistory(id, tenantId);
  }

  @Post('bulk/enable')
  @Permissions('edit_users')
  @ApiOperation({ summary: 'Bulk enable subscribers' })
  bulkEnable(@TenantId() tenantId: string, @Body() body: { ids: string[] }) {
    return this.service.bulkEnable(body.ids, tenantId);
  }

  @Post('bulk/disable')
  @Permissions('edit_users')
  @ApiOperation({ summary: 'Bulk disable subscribers' })
  bulkDisable(@TenantId() tenantId: string, @Body() body: { ids: string[] }) {
    return this.service.bulkDisable(body.ids, tenantId);
  }

  @Post('bulk/delete')
  @Permissions('delete_users')
  @ApiOperation({ summary: 'Bulk delete subscribers' })
  bulkDelete(@TenantId() tenantId: string, @Body() body: { ids: string[] }) {
    return this.service.bulkDelete(body.ids, tenantId);
  }
}
