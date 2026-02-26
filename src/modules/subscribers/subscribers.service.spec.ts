import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { SubscribersService } from './subscribers.service';
import { Subscriber } from './entities/subscriber.entity';
import { ServicePlan } from '../service-plans/entities/service-plan.entity';
import { Invoice } from '../billing/entities/invoice.entity';
import { ServiceChange } from './entities/service-change.entity';
import { Radacct } from '../radius/entities/radacct.entity';
import { Radpostauth } from '../radius/entities/radpostauth.entity';

const makeRepo = () => ({
  findOne: jest.fn(),
  find: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  remove: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  createQueryBuilder: jest.fn(),
});

const mockQueryRunner = () => ({
  connect: jest.fn(),
  startTransaction: jest.fn(),
  commitTransaction: jest.fn(),
  rollbackTransaction: jest.fn(),
  release: jest.fn(),
  manager: {
    findOne: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
  },
});

const mockDataSource = () => ({
  createQueryRunner: jest.fn(),
});

const mockPlan = {
  id: 'plan-1', name: '10Mbps Unlimited', tenantId: 'tenant-1',
  capExpiry: true, capDownload: false, capUpload: false, capTotal: false, capTime: false,
  initialDlMb: 0, initialUlMb: 0, initialTotalMb: 0, initialTimeSecs: 0,
  initialExpiryVal: 30, expiryUnit: 'days',
  dlTrafficUnitMb: 0, ulTrafficUnitMb: 0, totalTrafficUnitMb: 0,
  trafficAddMode: 'additive', dateAddMode: 'prolong', timeAddMode: 'prolong', timeUnit: 'hours',
  grossUnitPrice: 9.99, netUnitPrice: 9.99,
};

const mockSubscriber = {
  id: 'sub-1', username: 'testuser', tenantId: 'tenant-1',
  enabled: true, status: 'active', balance: 0,
  dlLimitBytes: '0', ulLimitBytes: '0', totalLimitBytes: '0', timeLimitSecs: 0,
  expiryDate: new Date(Date.now() + 86400000 * 30),
  plan: mockPlan, planId: 'plan-1',
};

describe('SubscribersService', () => {
  let service: SubscribersService;
  let repo: ReturnType<typeof makeRepo>;
  let planRepo: ReturnType<typeof makeRepo>;
  let invoiceRepo: ReturnType<typeof makeRepo>;
  let changeRepo: ReturnType<typeof makeRepo>;
  let dataSource: ReturnType<typeof mockDataSource>;
  let qr: ReturnType<typeof mockQueryRunner>;

  beforeEach(async () => {
    qr = mockQueryRunner();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscribersService,
        { provide: getRepositoryToken(Subscriber), useFactory: makeRepo },
        { provide: getRepositoryToken(ServicePlan), useFactory: makeRepo },
        { provide: getRepositoryToken(Invoice), useFactory: makeRepo },
        { provide: getRepositoryToken(ServiceChange), useFactory: makeRepo },
        { provide: getRepositoryToken(Radacct), useFactory: makeRepo },
        { provide: getRepositoryToken(Radpostauth), useFactory: makeRepo },
        { provide: DataSource, useFactory: mockDataSource },
      ],
    }).compile();

    service = module.get<SubscribersService>(SubscribersService);
    repo = module.get(getRepositoryToken(Subscriber));
    planRepo = module.get(getRepositoryToken(ServicePlan));
    invoiceRepo = module.get(getRepositoryToken(Invoice));
    changeRepo = module.get(getRepositoryToken(ServiceChange));
    dataSource = module.get(DataSource);
    dataSource.createQueryRunner.mockReturnValue(qr);
  });

  describe('findOne', () => {
    it('should return subscriber when found', async () => {
      repo.findOne.mockResolvedValue(mockSubscriber);
      const result = await service.findOne('sub-1', 'tenant-1');
      expect(result).toEqual(mockSubscriber);
      expect(repo.findOne).toHaveBeenCalledWith({
        where: { id: 'sub-1', tenantId: 'tenant-1' },
        relations: ['plan', 'group', 'manager'],
      });
    });

    it('should throw NotFoundException when not found', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.findOne('bad-id', 'tenant-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should throw ConflictException if username already exists', async () => {
      repo.findOne.mockResolvedValue(mockSubscriber);
      await expect(service.create('tenant-1', {
        username: 'testuser', password: 'pass', accountType: 'regular',
      } as any)).rejects.toThrow(ConflictException);
    });

    it('should create subscriber with bcrypt-hashed password and plaintext copy', async () => {
      repo.findOne.mockResolvedValue(null);
      planRepo.findOne.mockResolvedValue(null);
      const newSub = { ...mockSubscriber, id: 'sub-new' };
      repo.create.mockReturnValue(newSub);
      repo.save.mockResolvedValue(newSub);

      const result = await service.create('tenant-1', {
        username: 'newuser', password: 'secret123', accountType: 'regular',
      } as any);

      expect(repo.save).toHaveBeenCalled();
      expect(result.id).toBe('sub-new');

      const createArg = repo.create.mock.calls[0][0];
      expect(createArg.passwordPlain).toBe('secret123');
      expect(createArg.passwordHash).not.toBe('secret123');
      const isHash = await bcrypt.compare('secret123', createArg.passwordHash);
      expect(isHash).toBe(true);
      expect(createArg.password).toBeUndefined();
    });

    it('should set expiry date when plan has capExpiry', async () => {
      repo.findOne.mockResolvedValue(null);
      planRepo.findOne.mockResolvedValue(mockPlan);
      const newSub = { ...mockSubscriber };
      repo.create.mockReturnValue(newSub);
      repo.save.mockResolvedValue(newSub);

      await service.create('tenant-1', {
        username: 'newuser', password: 'pass', planId: 'plan-1', accountType: 'regular',
      } as any);

      expect(repo.save).toHaveBeenCalled();
      expect(newSub.expiryDate).toBeDefined();
    });
  });

  describe('update', () => {
    it('should update subscriber fields', async () => {
      repo.findOne.mockResolvedValue({ ...mockSubscriber });
      repo.save.mockResolvedValue({ ...mockSubscriber, firstName: 'Updated' });

      const result = await service.update('sub-1', 'tenant-1', { firstName: 'Updated' } as any);
      expect(repo.save).toHaveBeenCalled();
    });

    it('should store bcrypt-hashed password and plaintext copy on update', async () => {
      const sub = { ...mockSubscriber };
      repo.findOne.mockResolvedValue(sub);
      repo.save.mockResolvedValue(sub);

      await service.update('sub-1', 'tenant-1', { password: 'newpassword' } as any);

      const savedArg = repo.save.mock.calls[0][0];
      expect(savedArg.passwordPlain).toBe('newpassword');
      expect(savedArg.passwordHash).not.toBe('newpassword');
      const isHash = await bcrypt.compare('newpassword', savedArg.passwordHash);
      expect(isHash).toBe(true);
    });
  });

  describe('remove', () => {
    it('should remove subscriber', async () => {
      repo.findOne.mockResolvedValue(mockSubscriber);
      repo.remove.mockResolvedValue(undefined);
      await service.remove('sub-1', 'tenant-1');
      expect(repo.remove).toHaveBeenCalledWith(mockSubscriber);
    });

    it('should throw NotFoundException if subscriber not found', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.remove('bad-id', 'tenant-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('addCredits', () => {
    it('should throw NotFoundException if subscriber not found', async () => {
      qr.manager.findOne.mockResolvedValue(null);
      await expect(service.addCredits('bad-id', 'tenant-1', { amount: 1 } as any)).rejects.toThrow(NotFoundException);
      expect(qr.rollbackTransaction).toHaveBeenCalled();
    });

    it('should throw BadRequestException if no plan assigned', async () => {
      qr.manager.findOne.mockResolvedValue({ ...mockSubscriber, plan: null });
      await expect(service.addCredits('sub-1', 'tenant-1', { amount: 1 } as any)).rejects.toThrow(BadRequestException);
      expect(qr.rollbackTransaction).toHaveBeenCalled();
    });

    it('should add credits and create invoice', async () => {
      const sub = { ...mockSubscriber, plan: { ...mockPlan, trafficAddMode: 'add', dateAddMode: 'prolong' } };
      qr.manager.findOne.mockResolvedValue(sub);
      qr.manager.save.mockResolvedValue(sub);
      qr.manager.create.mockReturnValue({});

      const result = await service.addCredits('sub-1', 'tenant-1', {
        amount: 1, paymentType: 'cash',
      } as any);

      expect(qr.commitTransaction).toHaveBeenCalled();
      expect(qr.manager.save).toHaveBeenCalledTimes(2);
    });
  });

  describe('addDeposit', () => {
    it('should increase balance and create invoice', async () => {
      const sub = { ...mockSubscriber, balance: 10 };
      repo.findOne.mockResolvedValue(sub);
      repo.save.mockResolvedValue({ ...sub, balance: 60 });
      invoiceRepo.create.mockReturnValue({});
      invoiceRepo.save.mockResolvedValue({});

      await service.addDeposit('sub-1', 'tenant-1', { amount: 50 } as any);

      expect(repo.save).toHaveBeenCalled();
      expect(invoiceRepo.save).toHaveBeenCalled();
      expect(sub.balance).toBe(60);
    });
  });

  describe('changeService', () => {
    it('should schedule a service change when scheduleDate provided', async () => {
      repo.findOne.mockResolvedValue(mockSubscriber);
      planRepo.findOne.mockResolvedValue({ ...mockPlan, id: 'plan-2' });
      changeRepo.create.mockReturnValue({ id: 'change-1' });
      changeRepo.save.mockResolvedValue({ id: 'change-1' });

      const result = await service.changeService('sub-1', 'tenant-1', {
        newPlanId: 'plan-2', scheduleDate: new Date(Date.now() + 86400000).toISOString(),
      } as any);

      expect(result.scheduled).toBe(true);
      expect(result.changeId).toBe('change-1');
    });

    it('should immediately change plan when no scheduleDate', async () => {
      repo.findOne.mockResolvedValue({ ...mockSubscriber });
      planRepo.findOne.mockResolvedValue({ ...mockPlan, id: 'plan-2' });
      repo.save.mockResolvedValue({ ...mockSubscriber, planId: 'plan-2' });
      changeRepo.create.mockReturnValue({});
      changeRepo.save.mockResolvedValue({});

      const result = await service.changeService('sub-1', 'tenant-1', {
        newPlanId: 'plan-2',
      } as any);

      expect(result.scheduled).toBe(false);
      expect(repo.save).toHaveBeenCalled();
    });

    it('should throw BadRequestException if new plan not found', async () => {
      repo.findOne.mockResolvedValue(mockSubscriber);
      planRepo.findOne.mockResolvedValue(null);
      await expect(service.changeService('sub-1', 'tenant-1', { newPlanId: 'bad' } as any))
        .rejects.toThrow(BadRequestException);
    });
  });

  describe('bulk operations', () => {
    it('bulkEnable should update enabled=true for given ids', async () => {
      repo.update.mockResolvedValue({ affected: 2 });
      await service.bulkEnable(['sub-1', 'sub-2'], 'tenant-1');
      expect(repo.update).toHaveBeenCalledWith(
        { id: expect.anything(), tenantId: 'tenant-1' },
        { enabled: true },
      );
    });

    it('bulkDisable should update enabled=false for given ids', async () => {
      repo.update.mockResolvedValue({ affected: 2 });
      await service.bulkDisable(['sub-1', 'sub-2'], 'tenant-1');
      expect(repo.update).toHaveBeenCalledWith(
        { id: expect.anything(), tenantId: 'tenant-1' },
        { enabled: false },
      );
    });

    it('bulkDelete should delete given ids', async () => {
      repo.delete.mockResolvedValue({ affected: 2 });
      await service.bulkDelete(['sub-1', 'sub-2'], 'tenant-1');
      expect(repo.delete).toHaveBeenCalled();
    });
  });
});
