import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { TenantScopeInterceptor } from './common/interceptors/tenant-scope.interceptor';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new TenantScopeInterceptor());

  app.enableCors({
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
  });

  const config = new DocumentBuilder()
    .setTitle('RadiusNexus API')
    .setDescription('ISP RADIUS AAA & Billing Platform')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('auth', 'Authentication endpoints')
    .addTag('subscribers', 'Subscriber management')
    .addTag('service-plans', 'Service plan management')
    .addTag('managers', 'Manager/reseller management')
    .addTag('nas', 'NAS device management')
    .addTag('online-sessions', 'Active session management')
    .addTag('billing', 'Invoice & billing management')
    .addTag('cards', 'Prepaid card management')
    .addTag('ias', 'Instant Access Services')
    .addTag('reports', 'Reports & analytics')
    .addTag('tools', 'System tools')
    .addTag('ip-pools', 'IP pool management')
    .addTag('access-points', 'Access point management')
    .addTag('user-groups', 'User group management')
    .addTag('settings', 'System settings')
    .addTag('notifications', 'Notification templates')
    .addTag('radius', 'FreeRADIUS REST endpoints (internal)')
    .addTag('public', 'Public endpoints (no auth)')
    .addTag('portal', 'Subscriber self-service portal')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port);
  logger.log(`RadiusNexus API running on port ${port}`);
  logger.log(`Swagger docs at http://localhost:${port}/docs`);
}
bootstrap();
