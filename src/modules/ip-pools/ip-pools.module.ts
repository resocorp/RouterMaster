import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IpPool } from './entities/ip-pool.entity';
import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Injectable, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateIpPoolDto, UpdateIpPoolDto } from './dto/ip-pool.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { TenantId } from '../../common/decorators/tenant-id.decorator';

@Injectable()
export class IpPoolsService {
  constructor(@InjectRepository(IpPool) private readonly repo: Repository<IpPool>) {}

  findAll(tenantId: string) { return this.repo.find({ where: { tenantId }, order: { name: 'ASC' } }); }

  async findOne(id: string, tenantId: string) {
    const pool = await this.repo.findOne({ where: { id, tenantId } });
    if (!pool) throw new NotFoundException('IP Pool not found');
    return pool;
  }

  create(tenantId: string, dto: Partial<IpPool>) { return this.repo.save(this.repo.create({ ...dto, tenantId })); }

  async update(id: string, tenantId: string, dto: Partial<IpPool>) {
    const pool = await this.findOne(id, tenantId);
    Object.assign(pool, dto);
    return this.repo.save(pool);
  }

  async remove(id: string, tenantId: string) {
    const pool = await this.findOne(id, tenantId);
    await this.repo.remove(pool);
  }
}

@ApiTags('ip-pools') @ApiBearerAuth() @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard) @Roles('admin', 'manager')
@Controller('ip-pools')
export class IpPoolsController {
  constructor(private readonly service: IpPoolsService) {}

  @Get() @Permissions('list_pools') @ApiOperation({ summary: 'List IP pools' })
  findAll(@TenantId() tid: string) { return this.service.findAll(tid); }

  @Post() @Permissions('register_pools') @ApiOperation({ summary: 'Create IP pool' })
  create(@TenantId() tid: string, @Body() dto: CreateIpPoolDto) { return this.service.create(tid, dto); }

  @Get(':id') @Permissions('list_pools') @ApiOperation({ summary: 'Get IP pool' })
  findOne(@Param('id') id: string, @TenantId() tid: string) { return this.service.findOne(id, tid); }

  @Put(':id') @Permissions('edit_pools') @ApiOperation({ summary: 'Update IP pool' })
  update(@Param('id') id: string, @TenantId() tid: string, @Body() dto: UpdateIpPoolDto) { return this.service.update(id, tid, dto); }

  @Delete(':id') @Permissions('delete_pools') @ApiOperation({ summary: 'Delete IP pool' })
  remove(@Param('id') id: string, @TenantId() tid: string) { return this.service.remove(id, tid); }
}

@Module({
  imports: [TypeOrmModule.forFeature([IpPool])],
  controllers: [IpPoolsController],
  providers: [IpPoolsService],
  exports: [IpPoolsService],
})
export class IpPoolsModule {}
