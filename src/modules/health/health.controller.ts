import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { HealthService } from './health.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get('services')
  @ApiOperation({ summary: 'Check status of all essential services' })
  @ApiResponse({ status: 200, description: 'Service health statuses' })
  async getServiceStatuses() {
    const services = await this.healthService.checkAll();
    const allHealthy = services.every((s) => s.status === 'connected');
    return {
      overall: allHealthy ? 'healthy' : 'degraded',
      services,
      timestamp: new Date().toISOString(),
    };
  }
}
