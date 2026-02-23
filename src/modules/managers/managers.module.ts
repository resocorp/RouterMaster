import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ManagersController } from './managers.controller';
import { ManagersService } from './managers.service';
import { Manager } from './entities/manager.entity';
import { Invoice } from '../billing/entities/invoice.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Manager, Invoice])],
  controllers: [ManagersController],
  providers: [ManagersService],
  exports: [ManagersService],
})
export class ManagersModule {}
