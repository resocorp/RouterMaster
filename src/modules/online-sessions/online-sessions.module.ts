import { Module, Injectable, Controller, Get, Post, Param, Query, UseGuards, Logger } from '@nestjs/common';
import { TypeOrmModule, InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Radacct } from '../radius/entities/radacct.entity';
import { NasDevice } from '../nas/entities/nas-device.entity';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { TenantId } from '../../common/decorators/tenant-id.decorator';
import { RadiusDisconnectService } from '../radius/radius-disconnect.service';
import { PaginatedResult } from '../../common/dto/pagination.dto';

@Injectable()
export class OnlineSessionsService {
  constructor(
    @InjectRepository(Radacct) private readonly radacctRepo: Repository<Radacct>,
  ) {}

  async findActive(tenantId: string, page = 1, limit = 50): Promise<PaginatedResult<Radacct>> {
    const [data, total] = await this.radacctRepo.findAndCount({
      where: { tenantId, stopTime: IsNull() },
      order: { startTime: 'DESC' },
      skip: (page - 1) * limit, take: limit,
    });
    return new PaginatedResult(data, total, page, limit);
  }

  async countActive(tenantId: string): Promise<number> {
    return this.radacctRepo.count({ where: { tenantId, stopTime: IsNull() } });
  }

  async findByUser(username: string, tenantId: string) {
    return this.radacctRepo.find({
      where: { username, tenantId, stopTime: IsNull() },
      order: { startTime: 'DESC' },
    });
  }

  async getSessionHistory(tenantId: string, page = 1, limit = 50) {
    const [data, total] = await this.radacctRepo.findAndCount({
      where: { tenantId },
      order: { startTime: 'DESC' },
      skip: (page - 1) * limit, take: limit,
    });
    return new PaginatedResult(data, total, page, limit);
  }
}

@WebSocketGateway({ namespace: '/sessions', cors: { origin: '*' } })
export class SessionsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(SessionsGateway.name);

  handleConnection(client: Socket) {
    this.logger.log(`WS client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`WS client disconnected: ${client.id}`);
  }

  broadcastSessionUpdate(data: any) {
    this.server?.emit('session-update', data);
  }

  broadcastSessionCount(count: number) {
    this.server?.emit('session-count', { count });
  }
}

@ApiTags('online-sessions') @ApiBearerAuth() @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard) @Roles('admin', 'manager')
@Controller('online-sessions')
export class OnlineSessionsController {
  constructor(
    private readonly service: OnlineSessionsService,
    private readonly disconnectService: RadiusDisconnectService,
  ) {}

  @Get() @Permissions('online_users') @ApiOperation({ summary: 'List active sessions' })
  findActive(@TenantId() tid: string, @Query('page') p: number, @Query('limit') l: number) {
    return this.service.findActive(tid, p || 1, l || 50);
  }

  @Get('count') @Permissions('online_users') @ApiOperation({ summary: 'Count active sessions' })
  countActive(@TenantId() tid: string) { return this.service.countActive(tid); }

  @Get('user/:username') @Permissions('online_users') @ApiOperation({ summary: 'Sessions by username' })
  findByUser(@Param('username') username: string, @TenantId() tid: string) {
    return this.service.findByUser(username, tid);
  }

  @Get('history') @Permissions('connection_report') @ApiOperation({ summary: 'Session history' })
  history(@TenantId() tid: string, @Query('page') p: number, @Query('limit') l: number) {
    return this.service.getSessionHistory(tid, p || 1, l || 50);
  }

  @Post('disconnect/user/:username') @Permissions('disconnect_users') @ApiOperation({ summary: 'Disconnect all sessions for user' })
  disconnectUser(@Param('username') username: string, @TenantId() tid: string) {
    return this.disconnectService.disconnectUser(username, tid);
  }

  @Post('disconnect/session/:id') @Permissions('disconnect_users') @ApiOperation({ summary: 'Disconnect specific session' })
  disconnectSession(@Param('id') id: string, @TenantId() tid: string) {
    return this.disconnectService.disconnectSession(id, tid);
  }
}

@Module({
  imports: [
    TypeOrmModule.forFeature([Radacct, NasDevice]),
  ],
  controllers: [OnlineSessionsController],
  providers: [OnlineSessionsService, SessionsGateway, RadiusDisconnectService],
  exports: [OnlineSessionsService, SessionsGateway],
})
export class OnlineSessionsModule {}
