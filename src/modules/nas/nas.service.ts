import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NasDevice } from './entities/nas-device.entity';
import { MikrotikApiService, MikrotikTestResult, MikrotikCommandResult } from './mikrotik-api.service';
import { TestConnectionDto } from './dto/test-connection.dto';
import { ExecuteCommandDto } from './dto/execute-command.dto';

@Injectable()
export class NasService {
  constructor(
    @InjectRepository(NasDevice) private readonly repo: Repository<NasDevice>,
    private readonly mikrotikApi: MikrotikApiService,
  ) {}

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

  async testConnectionById(id: string, tenantId: string): Promise<MikrotikTestResult> {
    const nas = await this.findOne(id, tenantId);
    if (nas.type !== 'mikrotik') {
      throw new BadRequestException('Connection test is only supported for MikroTik devices');
    }
    if (!nas.apiUsername) {
      throw new BadRequestException('API username is not configured for this NAS device');
    }
    return this.mikrotikApi.testConnection(
      nas.ipAddress,
      nas.apiUsername,
      nas.apiPassword || '',
      nas.apiVersion || '6.45.1+',
    );
  }

  async testConnectionDirect(dto: TestConnectionDto): Promise<MikrotikTestResult> {
    return this.mikrotikApi.testConnection(
      dto.ipAddress,
      dto.apiUsername,
      dto.apiPassword || '',
      dto.apiVersion || '6.45.1+',
    );
  }

  async checkStatusAll(tenantId: string): Promise<Record<string, { reachable: boolean }>> {
    const devices = await this.repo.find({ where: { tenantId, type: 'mikrotik' } });
    const results: Record<string, { reachable: boolean }> = {};
    await Promise.all(
      devices.map(async (nas) => {
        const reachable = await this.mikrotikApi.checkReachability(nas.ipAddress);
        results[nas.id] = { reachable };
      }),
    );
    return results;
  }

  async executeCommand(id: string, tenantId: string, dto: ExecuteCommandDto): Promise<MikrotikCommandResult> {
    const nas = await this.findOne(id, tenantId);
    if (nas.type !== 'mikrotik') {
      throw new BadRequestException('Command execution is only supported for MikroTik devices');
    }
    if (!nas.apiUsername) {
      throw new BadRequestException('API username is not configured for this NAS device');
    }
    return this.mikrotikApi.executeCommand(
      nas.ipAddress,
      nas.apiUsername,
      nas.apiPassword || '',
      dto.command,
      dto.params || {},
      nas.apiVersion || '6.45.1+',
    );
  }
}
