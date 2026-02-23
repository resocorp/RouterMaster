import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NasDevice } from './entities/nas-device.entity';

@Injectable()
export class NasService {
  constructor(@InjectRepository(NasDevice) private readonly repo: Repository<NasDevice>) {}

  async findAll(tenantId: string): Promise<NasDevice[]> {
    return this.repo.find({ where: { tenantId }, order: { name: 'ASC' } });
  }

  async findOne(id: string, tenantId: string): Promise<NasDevice> {
    const nas = await this.repo.findOne({ where: { id, tenantId } });
    if (!nas) throw new NotFoundException('NAS device not found');
    return nas;
  }

  async create(tenantId: string, dto: Partial<NasDevice>): Promise<NasDevice> {
    const exists = await this.repo.findOne({ where: { ipAddress: dto.ipAddress as any, tenantId } });
    if (exists) throw new ConflictException('NAS with this IP already exists');
    return this.repo.save(this.repo.create({ ...dto, tenantId }));
  }

  async update(id: string, tenantId: string, dto: Partial<NasDevice>): Promise<NasDevice> {
    const nas = await this.findOne(id, tenantId);
    Object.assign(nas, dto);
    return this.repo.save(nas);
  }

  async remove(id: string, tenantId: string): Promise<void> {
    const nas = await this.findOne(id, tenantId);
    await this.repo.remove(nas);
  }
}
