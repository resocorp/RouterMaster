import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RadiusController } from './radius.controller';
import { RadiusService } from './radius.service';
import { RadiusReplyBuilder } from './radius-reply.builder';
import { RadiusDisconnectService } from './radius-disconnect.service';
import { Radacct } from './entities/radacct.entity';
import { Radpostauth } from './entities/radpostauth.entity';
import { Subscriber } from '../subscribers/entities/subscriber.entity';
import { ServicePlan } from '../service-plans/entities/service-plan.entity';
import { NasDevice } from '../nas/entities/nas-device.entity';
import { SpecialAccounting } from '../service-plans/entities/special-accounting.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Radacct,
      Radpostauth,
      Subscriber,
      ServicePlan,
      NasDevice,
      SpecialAccounting,
    ]),
  ],
  controllers: [RadiusController],
  providers: [RadiusService, RadiusReplyBuilder, RadiusDisconnectService],
  exports: [RadiusService, RadiusDisconnectService],
})
export class RadiusModule {}
