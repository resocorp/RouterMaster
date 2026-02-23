import { Injectable, Logger, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { ServicePlan } from './entities/service-plan.entity';
import { SpecialAccounting } from './entities/special-accounting.entity';
import { DynamicRate } from './entities/dynamic-rate.entity';
import { PaginatedResult } from '../../common/dto/pagination.dto';

@Injectable()
export class ServicePlansService {
  private readonly logger = new Logger(ServicePlansService.name);

  constructor(
    @InjectRepository(ServicePlan) private readonly repo: Repository<ServicePlan>,
    @InjectRepository(SpecialAccounting) private readonly specialRepo: Repository<SpecialAccounting>,
    @InjectRepository(DynamicRate) private readonly dynamicRepo: Repository<DynamicRate>,
  ) {}

  async findAll(tenantId: string): Promise<ServicePlan[]> {
    return this.repo.find({ where: { tenantId }, order: { name: 'ASC' } });
  }

  async findOne(id: string, tenantId: string): Promise<ServicePlan> {
    const plan = await this.repo.findOne({ where: { id, tenantId } });
    if (!plan) throw new NotFoundException('Service plan not found');
    return plan;
  }

  async create(tenantId: string, dto: Partial<ServicePlan>): Promise<ServicePlan> {
    const exists = await this.repo.findOne({ where: { name: dto.name, tenantId } });
    if (exists) throw new ConflictException('Plan name already exists');
    const plan = this.repo.create({ ...dto, tenantId });
    return this.repo.save(plan);
  }

  async update(id: string, tenantId: string, dto: Partial<ServicePlan>): Promise<ServicePlan> {
    const plan = await this.findOne(id, tenantId);
    Object.assign(plan, dto);
    return this.repo.save(plan);
  }

  async remove(id: string, tenantId: string): Promise<void> {
    const plan = await this.findOne(id, tenantId);
    await this.repo.remove(plan);
  }

  async getSpecialAccounting(planId: string, tenantId: string): Promise<SpecialAccounting[]> {
    await this.findOne(planId, tenantId);
    return this.specialRepo.find({ where: { planId }, order: { startTime: 'ASC' } });
  }

  async updateSpecialAccounting(planId: string, tenantId: string, rules: Partial<SpecialAccounting>[]): Promise<SpecialAccounting[]> {
    await this.findOne(planId, tenantId);
    await this.specialRepo.delete({ planId });
    const entities = rules.map(r => this.specialRepo.create({ ...r, planId }));
    return this.specialRepo.save(entities);
  }

  async getDynamicRates(planId: string, tenantId: string): Promise<DynamicRate[]> {
    await this.findOne(planId, tenantId);
    return this.dynamicRepo.find({ where: { planId }, order: { startTime: 'ASC' } });
  }

  async updateDynamicRates(planId: string, tenantId: string, rates: Partial<DynamicRate>[]): Promise<DynamicRate[]> {
    await this.findOne(planId, tenantId);
    await this.dynamicRepo.delete({ planId });
    const entities = rates.map(r => this.dynamicRepo.create({ ...r, planId }));
    return this.dynamicRepo.save(entities);
  }

  async bulkEnable(ids: string[], tenantId: string) {
    return this.repo.update({ id: In(ids), tenantId }, { enabled: true });
  }

  async bulkDisable(ids: string[], tenantId: string) {
    return this.repo.update({ id: In(ids), tenantId }, { enabled: false });
  }
}
