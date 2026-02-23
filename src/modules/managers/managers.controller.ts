import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ManagersService } from './managers.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { TenantId } from '../../common/decorators/tenant-id.decorator';

@ApiTags('managers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles('admin', 'manager')
@Controller('managers')
export class ManagersController {
  constructor(private readonly service: ManagersService) {}

  @Get() @Permissions('list_managers') @ApiOperation({ summary: 'List managers' })
  findAll(@TenantId() tid: string) { return this.service.findAll(tid); }

  @Post() @Permissions('register_managers') @ApiOperation({ summary: 'Create manager' })
  create(@TenantId() tid: string, @Body() dto: any) { return this.service.create(tid, dto); }

  @Get(':id') @Permissions('list_managers') @ApiOperation({ summary: 'Get manager' })
  findOne(@Param('id') id: string, @TenantId() tid: string) { return this.service.findOne(id, tid); }

  @Put(':id') @Permissions('edit_managers') @ApiOperation({ summary: 'Update manager' })
  update(@Param('id') id: string, @TenantId() tid: string, @Body() dto: any) { return this.service.update(id, tid, dto); }

  @Delete(':id') @Permissions('delete_managers') @ApiOperation({ summary: 'Delete manager' })
  remove(@Param('id') id: string, @TenantId() tid: string) { return this.service.remove(id, tid); }

  @Post(':id/credit') @Permissions('billing') @ApiOperation({ summary: 'Credit/debit manager balance' })
  credit(@Param('id') id: string, @TenantId() tid: string, @Body() body: { amount: number; remark?: string }) {
    return this.service.credit(id, tid, body.amount, body.remark);
  }

  @Get(':id/financials') @Permissions('billing') @ApiOperation({ summary: 'Manager financial summary' })
  financials(@Param('id') id: string, @TenantId() tid: string) { return this.service.getFinancials(id, tid); }
}
