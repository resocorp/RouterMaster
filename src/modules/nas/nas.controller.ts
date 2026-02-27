import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { NasService } from './nas.service';
import { CreateNasDto } from './dto/create-nas.dto';
import { UpdateNasDto } from './dto/update-nas.dto';
import { TestConnectionDto } from './dto/test-connection.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { TenantId } from '../../common/decorators/tenant-id.decorator';

@ApiTags('nas')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles('admin', 'manager')
@Controller('nas')
export class NasController {
  constructor(private readonly service: NasService) {}

  @Get() @Permissions('list_nas') @ApiOperation({ summary: 'List NAS devices' })
  findAll(@TenantId() tid: string) { return this.service.findAll(tid); }

  @Get('status') @Permissions('list_nas') @ApiOperation({ summary: 'Check reachability of all MikroTik NAS devices' })
  checkStatusAll(@TenantId() tid: string) { return this.service.checkStatusAll(tid); }

  @Post('test-connection') @Permissions('register_nas') @ApiOperation({ summary: 'Test MikroTik API connection with provided credentials' })
  testConnectionDirect(@Body() dto: TestConnectionDto) { return this.service.testConnectionDirect(dto); }

  @Post(':id/test-connection') @Permissions('edit_nas') @ApiOperation({ summary: 'Test MikroTik API connection for existing NAS device' })
  testConnection(@Param('id') id: string, @TenantId() tid: string) { return this.service.testConnectionById(id, tid); }

  @Post() @Permissions('register_nas') @ApiOperation({ summary: 'Create NAS device' })
  create(@TenantId() tid: string, @Body() dto: CreateNasDto) { return this.service.create(tid, dto); }

  @Get(':id') @Permissions('list_nas') @ApiOperation({ summary: 'Get NAS device' })
  findOne(@Param('id') id: string, @TenantId() tid: string) { return this.service.findOne(id, tid); }

  @Put(':id') @Permissions('edit_nas') @ApiOperation({ summary: 'Update NAS device' })
  update(@Param('id') id: string, @TenantId() tid: string, @Body() dto: UpdateNasDto) { return this.service.update(id, tid, dto); }

  @Delete(':id') @Permissions('delete_nas') @ApiOperation({ summary: 'Delete NAS device' })
  remove(@Param('id') id: string, @TenantId() tid: string) { return this.service.remove(id, tid); }
}
