import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NasController } from './nas.controller';
import { NasService } from './nas.service';
import { NasDevice } from './entities/nas-device.entity';

@Module({
  imports: [TypeOrmModule.forFeature([NasDevice])],
  controllers: [NasController],
  providers: [NasService],
  exports: [NasService],
})
export class NasModule {}
