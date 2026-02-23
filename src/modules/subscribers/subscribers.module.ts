import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SubscribersController } from './subscribers.controller';
import { SubscribersService } from './subscribers.service';
import { Subscriber } from './entities/subscriber.entity';
import { ServiceChange } from './entities/service-change.entity';
import { ServicePlan } from '../service-plans/entities/service-plan.entity';
import { Invoice } from '../billing/entities/invoice.entity';
import { Radacct } from '../radius/entities/radacct.entity';
import { Radpostauth } from '../radius/entities/radpostauth.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Subscriber, ServiceChange, ServicePlan, Invoice, Radacct, Radpostauth])],
  controllers: [SubscribersController],
  providers: [SubscribersService],
  exports: [SubscribersService],
})
export class SubscribersModule {}
