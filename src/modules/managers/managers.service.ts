import { Injectable, Logger, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DeepPartial } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Manager } from './entities/manager.entity';
import { Invoice } from '../billing/entities/invoice.entity';

@Injectable()
export class ManagersService {
  private readonly logger = new Logger(ManagersService.name);

  constructor(
    @InjectRepository(Manager) private readonly repo: Repository<Manager>,
    @InjectRepository(Invoice) private readonly invoiceRepo: Repository<Invoice>,
  ) {}

  async findAll(tenantId: string): Promise<Manager[]> {
    return this.repo.find({ where: { tenantId }, order: { username: 'ASC' } });
  }

  async findOne(id: string, tenantId: string): Promise<Manager> {
    const mgr = await this.repo.findOne({ where: { id, tenantId } });
    if (!mgr) throw new NotFoundException('Manager not found');
    return mgr;
  }

  async create(tenantId: string, dto: any): Promise<Manager> {
    const exists = await this.repo.findOne({ where: { username: dto.username, tenantId } });
    if (exists) throw new ConflictException('Username already exists');
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const data = { ...dto, tenantId, passwordHash };
    delete data.password;
    const manager = this.repo.create(data as DeepPartial<Manager>);
    return this.repo.save(manager);
  }

  async update(id: string, tenantId: string, dto: any): Promise<Manager> {
    const mgr = await this.findOne(id, tenantId);
    if (dto.password) {
      dto.passwordHash = await bcrypt.hash(dto.password, 10);
      delete dto.password;
    }
    Object.assign(mgr, dto);
    return this.repo.save(mgr);
  }

  async remove(id: string, tenantId: string): Promise<void> {
    const mgr = await this.findOne(id, tenantId);
    if (mgr.isSuper) throw new ForbiddenException('Cannot delete super admin');
    await this.repo.remove(mgr);
  }

  async credit(id: string, tenantId: string, amount: number, remark?: string): Promise<Manager> {
    const mgr = await this.findOne(id, tenantId);
    mgr.balance = Number(mgr.balance) + amount;
    await this.repo.save(mgr);
    const invoice = this.invoiceRepo.create({
      tenantId, managerId: id, type: 'internal',
      serviceName: amount >= 0 ? 'Manager credit' : 'Manager debit',
      amount: Math.abs(amount), grossPrice: Math.abs(amount), netPrice: Math.abs(amount),
      vatAmount: 0, remark: remark || `Balance adjustment: ${amount}`, paymentDate: new Date(),
    });
    await this.invoiceRepo.save(invoice);
    return mgr;
  }

  async getFinancials(id: string, tenantId: string) {
    const mgr = await this.findOne(id, tenantId);
    const invoices = await this.invoiceRepo.find({ where: { managerId: id, tenantId }, order: { createdAt: 'DESC' }, take: 50 });
    const totalRevenue = await this.invoiceRepo.createQueryBuilder('i')
      .select('SUM(i.gross_price)', 'total')
      .where('i.manager_id = :id AND i.tenant_id = :tenantId', { id, tenantId })
      .getRawOne();
    return { manager: mgr, recentInvoices: invoices, totalRevenue: totalRevenue?.total || 0 };
  }
}
