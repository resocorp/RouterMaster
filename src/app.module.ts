import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
import { BullModule } from '@nestjs/bull';
import * as path from 'path';

import { AuthModule } from './modules/auth/auth.module';
import { RadiusModule } from './modules/radius/radius.module';
import { SubscribersModule } from './modules/subscribers/subscribers.module';
import { ServicePlansModule } from './modules/service-plans/service-plans.module';
import { ManagersModule } from './modules/managers/managers.module';
import { NasModule } from './modules/nas/nas.module';
import { OnlineSessionsModule } from './modules/online-sessions/online-sessions.module';
import { BillingModule } from './modules/billing/billing.module';
import { CardsModule } from './modules/cards/cards.module';
import { IasModule } from './modules/ias/ias.module';
import { PortalModule } from './modules/portal/portal.module';
import { ReportsModule } from './modules/reports/reports.module';
import { SettingsModule } from './modules/settings/settings.module';
import { UserGroupsModule } from './modules/user-groups/user-groups.module';
import { IpPoolsModule } from './modules/ip-pools/ip-pools.module';
import { AccessPointsModule } from './modules/access-points/access-points.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { JobsModule } from './modules/jobs/jobs.module';
import { HealthModule } from './modules/health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres' as const,
        host: config.get<string>('DB_HOST', 'localhost'),
        port: config.get<number>('DB_PORT', 5432),
        username: config.get<string>('DB_USERNAME', 'radiusnexus'),
        password: config.get<string>('DB_PASSWORD', 'radiusnexus_secret'),
        database: config.get<string>('DB_DATABASE', 'radiusnexus'),
        entities: [path.join(__dirname, 'modules', '**', '*.entity.{ts,js}')],
        migrations: [path.join(__dirname, 'database', 'migrations', '*.{ts,js}')],
        synchronize: false,
        logging: config.get('NODE_ENV') === 'development',
      }),
    }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        redis: {
          host: config.get('REDIS_HOST', 'localhost'),
          port: config.get<number>('REDIS_PORT', 6379),
          password: config.get('REDIS_PASSWORD', 'redis_secret'),
        },
      }),
    }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 30 }]),
    ScheduleModule.forRoot(),
    AuthModule,
    RadiusModule,
    SubscribersModule,
    ServicePlansModule,
    ManagersModule,
    NasModule,
    OnlineSessionsModule,
    BillingModule,
    CardsModule,
    IasModule,
    PortalModule,
    ReportsModule,
    SettingsModule,
    UserGroupsModule,
    IpPoolsModule,
    AccessPointsModule,
    NotificationsModule,
    JobsModule,
    HealthModule,
  ],
})
export class AppModule {}
