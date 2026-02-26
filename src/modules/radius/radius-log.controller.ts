import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Sse,
  UseGuards,
  HttpCode,
  HttpStatus,
  Delete,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtService } from '@nestjs/jwt';
import { Observable, map } from 'rxjs';
import { Request } from 'express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { RadiusLogService, RadiusLogEntry } from './radius-log.service';
import { RadiusDiagnosticService } from './radius-diagnostic.service';

interface MessageEvent {
  data: string | object;
  id?: string;
  type?: string;
  retry?: number;
}

@ApiTags('radius-log')
@Controller('radius-log')
export class RadiusLogController {
  constructor(
    private readonly logService: RadiusLogService,
    private readonly diagnosticService: RadiusDiagnosticService,
    private readonly jwtService: JwtService,
  ) {}

  @Sse('stream')
  @ApiOperation({ summary: 'SSE stream of real-time RADIUS log events' })
  stream(@Req() req: Request, @Query('token') token?: string): Observable<MessageEvent> {
    // EventSource doesn't support custom headers, so accept token via query param
    const jwt = token || (req.headers.authorization?.replace('Bearer ', '') ?? '');
    if (!jwt) throw new UnauthorizedException('No token provided');
    try {
      this.jwtService.verify(jwt);
    } catch {
      throw new UnauthorizedException('Invalid token');
    }

    return this.logService.getStream().pipe(
      map((entry: RadiusLogEntry) => ({
        data: JSON.stringify(entry),
        id: entry.id,
        type: 'radius-log',
      })),
    );
  }

  @Get('recent')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get recent RADIUS log entries' })
  getRecent(@Query('limit') limit?: string) {
    const num = Math.min(parseInt(limit || '100', 10) || 100, 500);
    return this.logService.getRecentLogs(num);
  }

  @Delete('clear')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Clear in-memory log buffer' })
  clearLogs() {
    this.logService.clearLogs();
  }

  @Post('diagnose')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Run RADIUS auth diagnostics for a username' })
  async diagnose(
    @Body() body: { username: string; nasIp?: string; password?: string },
    @CurrentUser() user: JwtPayload,
  ) {
    return this.diagnosticService.diagnose(body.username, user.tenantId, body.nasIp, body.password);
  }

  @Get('auth-log')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get recent radpostauth entries from DB' })
  async getAuthLog(
    @CurrentUser() user: JwtPayload,
    @Query('limit') limit?: string,
  ) {
    const num = Math.min(parseInt(limit || '50', 10) || 50, 200);
    return this.diagnosticService.getRecentPostAuth(user.tenantId, num);
  }
}
