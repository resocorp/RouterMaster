import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { RadiusService } from './radius.service';
import { Subscriber } from '../subscribers/entities/subscriber.entity';
import { NasDevice } from '../nas/entities/nas-device.entity';
import { Radacct } from './entities/radacct.entity';
import { Radpostauth } from './entities/radpostauth.entity';
import { SpecialAccounting } from '../service-plans/entities/special-accounting.entity';
import { ServicePlan } from '../service-plans/entities/service-plan.entity';
import { RadiusReplyBuilder } from './radius-reply.builder';
import { DataSource } from 'typeorm';

const makeRepo = () => ({
  findOne: jest.fn(),
  find: jest.fn(),
  count: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
  createQueryBuilder: jest.fn(),
});

const mockReplyBuilder = () => ({ build: jest.fn(() => ({ 'Mikrotik-Rate-Limit': '10M/5M' })) });
const mockDataSource = () => ({ createQueryRunner: jest.fn() });

const mockNas = {
  id: 'nas-1', ipAddress: '10.0.0.1', type: 'mikrotik',
  secret: 'testing123', tenantId: 'tenant-1',
};

const mockPlan = {
  id: 'plan-1', name: '10Mbps', capExpiry: true, capDownload: false,
  capUpload: false, capTotal: false, capTime: false,
  rateDl: 10240, rateUl: 5120, priority: 8,
  nextExpiredId: null, nextDisabledId: null, nextDailyId: null,
  dailyDlMb: '0', dailyUlMb: '0', dailyTotalMb: '0',
};

const mockSubscriber = {
  id: 'sub-1', username: 'testuser', tenantId: 'tenant-1',
  enabled: true, status: 'active', simUse: 1, macLock: false,
  passwordPlain: 'test123',
  dlLimitBytes: '10737418240', ulLimitBytes: '5368709120',
  totalLimitBytes: '0', timeLimitSecs: 0,
  dailyDlUsed: '0', dailyUlUsed: '0', dailyTotalUsed: '0',
  dailyTimeUsed: 0, dailyResetAt: null,
  expiryDate: new Date(Date.now() + 86400000 * 30),
  plan: mockPlan,
  planId: 'plan-1',
};

describe('RadiusService', () => {
  let service: RadiusService;
  let subscriberRepo: ReturnType<typeof makeRepo>;
  let nasRepo: ReturnType<typeof makeRepo>;
  let radacctRepo: ReturnType<typeof makeRepo>;
  let radpostauthRepo: ReturnType<typeof makeRepo>;
  let specialAcctRepo: ReturnType<typeof makeRepo>;
  let planRepo: ReturnType<typeof makeRepo>;
  let replyBuilder: ReturnType<typeof mockReplyBuilder>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RadiusService,
        { provide: getRepositoryToken(Subscriber), useFactory: makeRepo },
        { provide: getRepositoryToken(NasDevice), useFactory: makeRepo },
        { provide: getRepositoryToken(Radacct), useFactory: makeRepo },
        { provide: getRepositoryToken(Radpostauth), useFactory: makeRepo },
        { provide: getRepositoryToken(SpecialAccounting), useFactory: makeRepo },
        { provide: getRepositoryToken(ServicePlan), useFactory: makeRepo },
        { provide: RadiusReplyBuilder, useFactory: mockReplyBuilder },
        { provide: DataSource, useFactory: mockDataSource },
      ],
    }).compile();

    service = module.get<RadiusService>(RadiusService);
    subscriberRepo = module.get(getRepositoryToken(Subscriber));
    nasRepo = module.get(getRepositoryToken(NasDevice));
    radacctRepo = module.get(getRepositoryToken(Radacct));
    radpostauthRepo = module.get(getRepositoryToken(Radpostauth));
    specialAcctRepo = module.get(getRepositoryToken(SpecialAccounting));
    planRepo = module.get(getRepositoryToken(ServicePlan));
    replyBuilder = module.get(RadiusReplyBuilder);
  });

  describe('authorize', () => {
    it('should reject unknown NAS', async () => {
      nasRepo.findOne.mockResolvedValue(null);
      const result = await service.authorize({
        username: 'testuser', password: 'pass', nas_ip: '1.2.3.4',
      });
      expect(result.code).toBe(403);
      expect(result.attributes['Reply-Message']).toContain('Unknown NAS');
    });

    it('should reject unknown subscriber', async () => {
      nasRepo.findOne.mockResolvedValue(mockNas);
      subscriberRepo.findOne.mockResolvedValue(null);
      const result = await service.authorize({
        username: 'nobody', password: 'pass', nas_ip: '10.0.0.1',
      });
      expect(result.code).toBe(403);
      expect(result.attributes['Reply-Message']).toContain('not found');
    });

    it('should reject disabled subscriber', async () => {
      nasRepo.findOne.mockResolvedValue(mockNas);
      subscriberRepo.findOne.mockResolvedValue({ ...mockSubscriber, enabled: false });
      const result = await service.authorize({
        username: 'testuser', password: 'pass', nas_ip: '10.0.0.1',
      });
      expect(result.code).toBe(403);
      expect(result.attributes['Reply-Message']).toContain('disabled');
    });

    it('should reject expired subscriber with no fallback plan', async () => {
      nasRepo.findOne.mockResolvedValue(mockNas);
      subscriberRepo.findOne.mockResolvedValue({
        ...mockSubscriber,
        expiryDate: new Date(Date.now() - 86400000),
        plan: { ...mockPlan, nextExpiredId: null },
      });
      specialAcctRepo.find.mockResolvedValue([]);
      const result = await service.authorize({
        username: 'testuser', password: 'pass', nas_ip: '10.0.0.1',
      });
      expect(result.code).toBe(403);
      expect(result.attributes['Reply-Message']).toContain('expired');
    });

    it('should authorize valid active subscriber', async () => {
      nasRepo.findOne.mockResolvedValue(mockNas);
      subscriberRepo.findOne.mockResolvedValue(mockSubscriber);
      subscriberRepo.update.mockResolvedValue({});
      radacctRepo.count.mockResolvedValue(0);
      specialAcctRepo.find.mockResolvedValue([]);
      replyBuilder.build.mockReturnValue({ 'Mikrotik-Rate-Limit': '10M/5M' });

      const result = await service.authorize({
        username: 'testuser', password: 'pass', nas_ip: '10.0.0.1',
      });
      expect(result.code).toBe(200);
      expect(result.attributes).toHaveProperty('Mikrotik-Rate-Limit');
    });

    it('should reject when simultaneous session limit exceeded', async () => {
      nasRepo.findOne.mockResolvedValue(mockNas);
      subscriberRepo.findOne.mockResolvedValue({ ...mockSubscriber, simUse: 1 });
      subscriberRepo.update.mockResolvedValue({});
      radacctRepo.count.mockResolvedValue(1);
      specialAcctRepo.find.mockResolvedValue([]);

      const result = await service.authorize({
        username: 'testuser', password: 'pass', nas_ip: '10.0.0.1',
      });
      expect(result.code).toBe(403);
      expect(result.attributes['Reply-Message']).toContain('sessions');
    });

    it('should reject MAC mismatch when mac_lock is enabled', async () => {
      nasRepo.findOne.mockResolvedValue(mockNas);
      subscriberRepo.findOne.mockResolvedValue({
        ...mockSubscriber, macLock: true, macCpe: 'AA:BB:CC:DD:EE:FF', simUse: 0,
      });
      subscriberRepo.update.mockResolvedValue({});
      specialAcctRepo.find.mockResolvedValue([]);

      const result = await service.authorize({
        username: 'testuser', password: 'pass', nas_ip: '10.0.0.1',
        calling_station: '11:22:33:44:55:66',
      });
      expect(result.code).toBe(403);
      expect(result.attributes['Reply-Message']).toContain('MAC');
    });
  });

  describe('authenticate', () => {
    it('should return 403 for unknown user', async () => {
      nasRepo.findOne.mockResolvedValue(mockNas);
      subscriberRepo.findOne.mockResolvedValue(null);
      const result = await service.authenticate({
        username: 'nobody', password: 'pass', nas_ip: '10.0.0.1',
      });
      expect(result.code).toBe(403);
    });

    it('should return 403 for wrong password (plaintext)', async () => {
      nasRepo.findOne.mockResolvedValue(mockNas);
      subscriberRepo.findOne.mockResolvedValue({ ...mockSubscriber, passwordPlain: 'correct' });
      const result = await service.authenticate({
        username: 'testuser', password: 'wrong', nas_ip: '10.0.0.1',
      });
      expect(result.code).toBe(403);
    });

    it('should return 200 for correct plaintext password', async () => {
      nasRepo.findOne.mockResolvedValue(mockNas);
      subscriberRepo.findOne.mockResolvedValue({ ...mockSubscriber, passwordPlain: 'test123' });
      const result = await service.authenticate({
        username: 'testuser', password: 'test123', nas_ip: '10.0.0.1',
      });
      expect(result.code).toBe(200);
    });

    it('should return 200 for correct password via bcrypt fallback', async () => {
      const bcrypt = require('bcrypt');
      const hash = await bcrypt.hash('test123', 10);
      nasRepo.findOne.mockResolvedValue(mockNas);
      subscriberRepo.findOne.mockResolvedValue({ ...mockSubscriber, passwordPlain: null, passwordHash: hash });
      const result = await service.authenticate({
        username: 'testuser', password: 'test123', nas_ip: '10.0.0.1',
      });
      expect(result.code).toBe(200);
    });

    it('should tenant-scope subscriber lookup using NAS', async () => {
      nasRepo.findOne.mockResolvedValue(mockNas);
      subscriberRepo.findOne.mockResolvedValue({ ...mockSubscriber, passwordPlain: 'test123' });
      await service.authenticate({
        username: 'testuser', password: 'test123', nas_ip: '10.0.0.1',
      });
      expect(subscriberRepo.findOne).toHaveBeenCalledWith({
        where: { username: 'testuser', tenantId: 'tenant-1' },
      });
    });

    it('should still work when NAS is unknown (no tenant filter)', async () => {
      nasRepo.findOne.mockResolvedValue(null);
      subscriberRepo.findOne.mockResolvedValue({ ...mockSubscriber, passwordPlain: 'test123' });
      const result = await service.authenticate({
        username: 'testuser', password: 'test123', nas_ip: '9.9.9.9',
      });
      expect(result.code).toBe(200);
      expect(subscriberRepo.findOne).toHaveBeenCalledWith({
        where: { username: 'testuser' },
      });
    });
  });

  describe('accounting', () => {
    it('should return 200 for Start and create radacct record', async () => {
      nasRepo.findOne.mockResolvedValue(mockNas);
      subscriberRepo.findOne.mockResolvedValue(mockSubscriber);
      radacctRepo.create.mockReturnValue({});
      radacctRepo.save.mockResolvedValue({});

      const result = await service.accounting({
        status_type: 'Start', session_id: 'sess-001',
        username: 'testuser', nas_ip: '10.0.0.1',
      });
      expect(result.code).toBe(200);
      expect(radacctRepo.save).toHaveBeenCalled();
    });

    it('should handle accounting-on/off by closing open sessions', async () => {
      radacctRepo.update.mockResolvedValue({ affected: 3 });
      const result = await service.accounting({
        status_type: 'Accounting-On', session_id: '',
        username: '', nas_ip: '10.0.0.1',
      });
      expect(result.code).toBe(200);
      expect(radacctRepo.update).toHaveBeenCalled();
    });

    it('should handle Interim-Update for existing session', async () => {
      const mockSession = {
        id: '1', sessionId: 'sess-001', tenantId: 'tenant-1',
        inputOctets: '1000', outputOctets: '2000',
        inputGigawords: 0, outputGigawords: 0,
        framedIp: '192.168.1.10',
      };
      radacctRepo.findOne.mockResolvedValue(mockSession);
      radacctRepo.update.mockResolvedValue({});
      subscriberRepo.findOne.mockResolvedValue({ ...mockSubscriber, plan: { ...mockPlan, capDownload: false } });
      specialAcctRepo.find.mockResolvedValue([]);

      const result = await service.accounting({
        status_type: 'Interim-Update', session_id: 'sess-001',
        username: 'testuser', nas_ip: '10.0.0.1',
        input_octets: '5000', output_octets: '10000',
        session_time: '120',
      });
      expect(result.code).toBe(200);
      expect(radacctRepo.update).toHaveBeenCalled();
    });

    it('should handle Stop for existing session', async () => {
      const mockSession = {
        id: '1', sessionId: 'sess-002', tenantId: 'tenant-1',
        inputOctets: '0', outputOctets: '0',
        inputGigawords: 0, outputGigawords: 0,
      };
      radacctRepo.findOne.mockResolvedValue(mockSession);
      radacctRepo.update.mockResolvedValue({});
      subscriberRepo.findOne.mockResolvedValue({ ...mockSubscriber, plan: { ...mockPlan, capDownload: false } });
      specialAcctRepo.find.mockResolvedValue([]);

      const result = await service.accounting({
        status_type: 'Stop', session_id: 'sess-002',
        username: 'testuser', nas_ip: '10.0.0.1',
        input_octets: '100000', output_octets: '200000',
        session_time: '600', terminate_cause: 'User-Request',
      });
      expect(result.code).toBe(200);
      expect(radacctRepo.update).toHaveBeenCalled();
    });
  });

  describe('postAuth', () => {
    it('should save post-auth record and return 200', async () => {
      nasRepo.findOne.mockResolvedValue(mockNas);
      radpostauthRepo.create.mockReturnValue({});
      radpostauthRepo.save.mockResolvedValue({});

      const result = await service.postAuth({
        username: 'testuser', reply: 'Access-Accept', nas_ip: '10.0.0.1',
      });
      expect(result.code).toBe(200);
      expect(radpostauthRepo.save).toHaveBeenCalled();
    });

    it('should resolve tenantId from subscriber when NAS is unknown', async () => {
      nasRepo.findOne.mockResolvedValue(null);
      subscriberRepo.findOne.mockResolvedValue(mockSubscriber);
      radpostauthRepo.create.mockReturnValue({});
      radpostauthRepo.save.mockResolvedValue({});

      const result = await service.postAuth({
        username: 'testuser', reply: 'Access-Reject', nas_ip: '9.9.9.9',
      });
      expect(result.code).toBe(200);
      expect(radpostauthRepo.save).toHaveBeenCalled();
    });

    it('should skip log when tenantId cannot be resolved', async () => {
      nasRepo.findOne.mockResolvedValue(null);
      subscriberRepo.findOne.mockResolvedValue(null);

      const result = await service.postAuth({
        username: 'unknown', reply: 'Access-Reject', nas_ip: '9.9.9.9',
      });
      expect(result.code).toBe(200);
      expect(radpostauthRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('authorize - tenant scoping', () => {
    it('should scope subscriber lookup by NAS tenantId', async () => {
      nasRepo.findOne.mockResolvedValue(mockNas);
      subscriberRepo.findOne.mockResolvedValue(mockSubscriber);
      subscriberRepo.update.mockResolvedValue({});
      radacctRepo.count.mockResolvedValue(0);
      specialAcctRepo.find.mockResolvedValue([]);
      replyBuilder.build.mockReturnValue({ 'Mikrotik-Rate-Limit': '10M/5M' });

      await service.authorize({
        username: 'testuser', password: 'pass', nas_ip: '10.0.0.1',
      });
      expect(subscriberRepo.findOne).toHaveBeenCalledWith({
        where: { username: 'testuser', tenantId: 'tenant-1' },
        relations: ['plan'],
      });
    });

    it('should include Cleartext-Password when passwordPlain is set', async () => {
      nasRepo.findOne.mockResolvedValue(mockNas);
      subscriberRepo.findOne.mockResolvedValue({ ...mockSubscriber, passwordPlain: 'secret123' });
      subscriberRepo.update.mockResolvedValue({});
      radacctRepo.count.mockResolvedValue(0);
      specialAcctRepo.find.mockResolvedValue([]);
      replyBuilder.build.mockReturnValue({ 'Mikrotik-Rate-Limit': '10M/5M' });

      const result = await service.authorize({
        username: 'testuser', password: 'pass', nas_ip: '10.0.0.1',
      });
      expect(result.code).toBe(200);
      expect(result.attributes['Cleartext-Password']).toBe('secret123');
    });

    it('should NOT include Cleartext-Password when passwordPlain is null', async () => {
      nasRepo.findOne.mockResolvedValue(mockNas);
      subscriberRepo.findOne.mockResolvedValue({ ...mockSubscriber, passwordPlain: null });
      subscriberRepo.update.mockResolvedValue({});
      radacctRepo.count.mockResolvedValue(0);
      specialAcctRepo.find.mockResolvedValue([]);
      replyBuilder.build.mockReturnValue({ 'Mikrotik-Rate-Limit': '10M/5M' });

      const result = await service.authorize({
        username: 'testuser', password: 'pass', nas_ip: '10.0.0.1',
      });
      expect(result.code).toBe(200);
      expect(result.attributes['Cleartext-Password']).toBeUndefined();
    });

    it('should reject when download limit exceeded', async () => {
      nasRepo.findOne.mockResolvedValue(mockNas);
      subscriberRepo.findOne.mockResolvedValue({
        ...mockSubscriber,
        dlLimitBytes: '0',
        plan: { ...mockPlan, capDownload: true, nextExpiredId: null },
      });
      const result = await service.authorize({
        username: 'testuser', password: 'pass', nas_ip: '10.0.0.1',
      });
      expect(result.code).toBe(403);
      expect(result.attributes['Reply-Message']).toContain('Download limit');
    });

    it('should reject when upload limit exceeded', async () => {
      nasRepo.findOne.mockResolvedValue(mockNas);
      subscriberRepo.findOne.mockResolvedValue({
        ...mockSubscriber,
        ulLimitBytes: '0',
        plan: { ...mockPlan, capUpload: true },
      });
      const result = await service.authorize({
        username: 'testuser', password: 'pass', nas_ip: '10.0.0.1',
      });
      expect(result.code).toBe(403);
      expect(result.attributes['Reply-Message']).toContain('Upload limit');
    });

    it('should reject when total traffic limit exceeded', async () => {
      nasRepo.findOne.mockResolvedValue(mockNas);
      subscriberRepo.findOne.mockResolvedValue({
        ...mockSubscriber,
        totalLimitBytes: '0',
        plan: { ...mockPlan, capTotal: true },
      });
      const result = await service.authorize({
        username: 'testuser', password: 'pass', nas_ip: '10.0.0.1',
      });
      expect(result.code).toBe(403);
      expect(result.attributes['Reply-Message']).toContain('Total traffic limit');
    });

    it('should reject when time limit exceeded', async () => {
      nasRepo.findOne.mockResolvedValue(mockNas);
      subscriberRepo.findOne.mockResolvedValue({
        ...mockSubscriber,
        timeLimitSecs: 0,
        plan: { ...mockPlan, capTime: true },
      });
      const result = await service.authorize({
        username: 'testuser', password: 'pass', nas_ip: '10.0.0.1',
      });
      expect(result.code).toBe(403);
      expect(result.attributes['Reply-Message']).toContain('Time limit');
    });

    it('should reject subscriber with no plan', async () => {
      nasRepo.findOne.mockResolvedValue(mockNas);
      subscriberRepo.findOne.mockResolvedValue({ ...mockSubscriber, plan: null });
      const result = await service.authorize({
        username: 'testuser', password: 'pass', nas_ip: '10.0.0.1',
      });
      expect(result.code).toBe(403);
      expect(result.attributes['Reply-Message']).toContain('No service plan');
    });

    it('should lock MAC when macLock enabled and no stored MAC', async () => {
      nasRepo.findOne.mockResolvedValue(mockNas);
      subscriberRepo.findOne.mockResolvedValue({
        ...mockSubscriber, macLock: true, macCpe: null, simUse: 0,
      });
      subscriberRepo.update.mockResolvedValue({});
      specialAcctRepo.find.mockResolvedValue([]);
      replyBuilder.build.mockReturnValue({ 'Mikrotik-Rate-Limit': '10M/5M' });

      const result = await service.authorize({
        username: 'testuser', password: 'pass', nas_ip: '10.0.0.1',
        calling_station: 'AA:BB:CC:DD:EE:FF',
      });
      expect(result.code).toBe(200);
      expect(subscriberRepo.update).toHaveBeenCalledWith(
        mockSubscriber.id,
        expect.objectContaining({ macCpe: 'AA:BB:CC:DD:EE:FF' }),
      );
    });
  });
});
