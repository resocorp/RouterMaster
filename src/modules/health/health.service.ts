import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import Redis from 'ioredis';
import * as dgram from 'dgram';

export interface ServiceStatus {
  name: string;
  status: 'connected' | 'disconnected';
  latency?: number;
}

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
  ) {}

  async checkAll(): Promise<ServiceStatus[]> {
    const [postgres, redis, freeradius] = await Promise.all([
      this.checkPostgres(),
      this.checkRedis(),
      this.checkFreeRadius(),
    ]);

    return [
      { name: 'API', status: 'connected', latency: 0 },
      postgres,
      redis,
      freeradius,
    ];
  }

  private async checkPostgres(): Promise<ServiceStatus> {
    const start = Date.now();
    try {
      await this.dataSource.query('SELECT 1');
      return { name: 'PostgreSQL', status: 'connected', latency: Date.now() - start };
    } catch (err) {
      this.logger.warn(`PostgreSQL health check failed: ${err.message}`);
      return { name: 'PostgreSQL', status: 'disconnected' };
    }
  }

  private async checkRedis(): Promise<ServiceStatus> {
    const start = Date.now();
    const host = this.configService.get('REDIS_HOST', 'localhost');
    const port = this.configService.get<number>('REDIS_PORT', 6379);
    const password = this.configService.get('REDIS_PASSWORD', 'redis_secret');

    const redis = new Redis({
      host,
      port,
      password,
      connectTimeout: 3000,
      lazyConnect: true,
    });

    try {
      await redis.connect();
      await redis.ping();
      const latency = Date.now() - start;
      await redis.quit();
      return { name: 'Redis', status: 'connected', latency };
    } catch (err) {
      this.logger.warn(`Redis health check failed: ${err.message}`);
      try { await redis.quit(); } catch {}
      return { name: 'Redis', status: 'disconnected' };
    }
  }

  private checkFreeRadius(): Promise<ServiceStatus> {
    return new Promise((resolve) => {
      const start = Date.now();
      const host = this.configService.get('FREERADIUS_HOST', 'localhost');
      const port = 1812;

      const client = dgram.createSocket('udp4');
      let settled = false;

      const done = (status: 'connected' | 'disconnected') => {
        if (settled) return;
        settled = true;
        clearTimeout(errorWindow);
        try { client.close(); } catch {}
        resolve({
          name: 'FreeRADIUS',
          status,
          ...(status === 'connected' ? { latency: Date.now() - start } : {}),
        });
      };

      // Send a UDP probe. If the port is open (FreeRADIUS running), the packet
      // is silently consumed/dropped (no ICMP error). If nothing listens, the OS
      // returns ICMP "port unreachable" which surfaces as a socket error.
      // So: error within 1.5s → disconnected; no error → connected.
      const packet = Buffer.alloc(20);
      packet[0] = 12; // Status-Server code
      packet.writeUInt16BE(20, 2);

      client.send(packet, 0, packet.length, port, host, (err) => {
        if (err) {
          done('disconnected');
          return;
        }
      });

      client.on('message', () => done('connected'));
      client.on('error', () => done('disconnected'));

      // If no ICMP error arrives within 1.5s, the port is open (service running)
      const errorWindow = setTimeout(() => done('connected'), 1500);
    });
  }
}
