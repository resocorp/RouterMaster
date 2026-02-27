import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NasController } from './nas.controller';
import { NasService } from './nas.service';
import { NasDevice } from './entities/nas-device.entity';
import { MikrotikApiService } from './mikrotik-api.service';

@Module({
  imports: [TypeOrmModule.forFeature([NasDevice])],
  controllers: [NasController],
  providers: [NasService, MikrotikApiService],
  exports: [NasService, MikrotikApiService],
})
export class NasModule {}
