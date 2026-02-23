import { Module, Injectable, NotFoundException, Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { TypeOrmModule, InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UserGroup } from './entities/user-group.entity';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { TenantId } from '../../common/decorators/tenant-id.decorator';

@Injectable()
export class UserGroupsService {
  constructor(@InjectRepository(UserGroup) private readonly repo: Repository<UserGroup>) {}
  findAll(tenantId: string) { return this.repo.find({ where: { tenantId }, order: { name: 'ASC' } }); }
  async findOne(id: string, tenantId: string) {
    const g = await this.repo.findOne({ where: { id, tenantId } });
    if (!g) throw new NotFoundException('User group not found');
    return g;
  }
  create(tenantId: string, dto: Partial<UserGroup>) { return this.repo.save(this.repo.create({ ...dto, tenantId })); }
  async update(id: string, tenantId: string, dto: Partial<UserGroup>) {
    const g = await this.findOne(id, tenantId); Object.assign(g, dto); return this.repo.save(g);
  }
  async remove(id: string, tenantId: string) { const g = await this.findOne(id, tenantId); await this.repo.remove(g); }
}

@ApiTags('user-groups') @ApiBearerAuth() @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard) @Roles('admin', 'manager')
@Controller('user-groups')
export class UserGroupsController {
  constructor(private readonly service: UserGroupsService) {}
  @Get() @Permissions('list_groups') @ApiOperation({ summary: 'List user groups' })
  findAll(@TenantId() tid: string) { return this.service.findAll(tid); }
  @Post() @Permissions('register_groups') @ApiOperation({ summary: 'Create user group' })
  create(@TenantId() tid: string, @Body() dto: any) { return this.service.create(tid, dto); }
  @Get(':id') @Permissions('list_groups') @ApiOperation({ summary: 'Get user group' })
  findOne(@Param('id') id: string, @TenantId() tid: string) { return this.service.findOne(id, tid); }
  @Put(':id') @Permissions('edit_groups') @ApiOperation({ summary: 'Update user group' })
  update(@Param('id') id: string, @TenantId() tid: string, @Body() dto: any) { return this.service.update(id, tid, dto); }
  @Delete(':id') @Permissions('delete_groups') @ApiOperation({ summary: 'Delete user group' })
  remove(@Param('id') id: string, @TenantId() tid: string) { return this.service.remove(id, tid); }
}

@Module({
  imports: [TypeOrmModule.forFeature([UserGroup])],
  controllers: [UserGroupsController],
  providers: [UserGroupsService],
  exports: [UserGroupsService],
})
export class UserGroupsModule {}
