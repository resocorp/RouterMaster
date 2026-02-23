import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServicePlansController } from './service-plans.controller';
import { ServicePlansService } from './service-plans.service';
import { ServicePlan } from './entities/service-plan.entity';
import { SpecialAccounting } from './entities/special-accounting.entity';
import { DynamicRate } from './entities/dynamic-rate.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ServicePlan, SpecialAccounting, DynamicRate])],
  controllers: [ServicePlansController],
  providers: [ServicePlansService],
  exports: [ServicePlansService],
})
export class ServicePlansModule {}
