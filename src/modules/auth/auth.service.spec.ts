import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { Manager } from '../managers/entities/manager.entity';
import { Subscriber } from '../subscribers/entities/subscriber.entity';
import { Tenant } from '../settings/entities/tenant.entity';

const mockManagerRepo = () => ({ findOne: jest.fn() });
const mockSubscriberRepo = () => ({ findOne: jest.fn() });
const mockTenantRepo = () => ({ findOne: jest.fn() });
const mockJwtService = () => ({ sign: jest.fn(() => 'mock.jwt.token'), verify: jest.fn() });
const mockConfigService = () => ({ get: jest.fn((key: string, def?: any) => def) });

describe('AuthService', () => {
  let service: AuthService;
  let managerRepo: ReturnType<typeof mockManagerRepo>;
  let subscriberRepo: ReturnType<typeof mockSubscriberRepo>;
  let jwtService: ReturnType<typeof mockJwtService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(Manager), useFactory: mockManagerRepo },
        { provide: getRepositoryToken(Subscriber), useFactory: mockSubscriberRepo },
        { provide: getRepositoryToken(Tenant), useFactory: mockTenantRepo },
        { provide: JwtService, useFactory: mockJwtService },
        { provide: ConfigService, useFactory: mockConfigService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    managerRepo = module.get(getRepositoryToken(Manager));
    subscriberRepo = module.get(getRepositoryToken(Subscriber));
    jwtService = module.get(JwtService);
  });

  describe('loginAdmin', () => {
    it('should return tokens on valid credentials', async () => {
      const hash = await bcrypt.hash('password123', 10);
      managerRepo.findOne.mockResolvedValue({
        id: 'mgr-1',
        username: 'admin',
        passwordHash: hash,
        isSuper: true,
        enabled: true,
        tenantId: 'tenant-1',
        firstName: 'Super',
        lastName: 'Admin',
        email: 'admin@test.com',
        permissions: {},
        tenant: { enabled: true },
      });

      const result = await service.loginAdmin('admin', 'password123');

      expect(result).toHaveProperty('access_token');
      expect(result).toHaveProperty('refresh_token');
      expect(result.user.username).toBe('admin');
      expect(result.user.role).toBe('admin');
    });

    it('should throw UnauthorizedException for unknown user', async () => {
      managerRepo.findOne.mockResolvedValue(null);
      await expect(service.loginAdmin('nobody', 'pass')).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for wrong password', async () => {
      const hash = await bcrypt.hash('correct', 10);
      managerRepo.findOne.mockResolvedValue({
        id: 'mgr-1', username: 'admin', passwordHash: hash,
        enabled: true, tenant: { enabled: true },
      });
      await expect(service.loginAdmin('admin', 'wrong')).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for disabled account', async () => {
      const hash = await bcrypt.hash('pass', 10);
      managerRepo.findOne.mockResolvedValue({
        id: 'mgr-1', username: 'admin', passwordHash: hash,
        enabled: false, tenant: { enabled: true },
      });
      await expect(service.loginAdmin('admin', 'pass')).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for disabled tenant', async () => {
      const hash = await bcrypt.hash('pass', 10);
      managerRepo.findOne.mockResolvedValue({
        id: 'mgr-1', username: 'admin', passwordHash: hash,
        enabled: true, tenant: { enabled: false },
      });
      await expect(service.loginAdmin('admin', 'pass')).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('loginSubscriber', () => {
    it('should return tokens on valid subscriber credentials', async () => {
      const hash = await bcrypt.hash('test123', 10);
      subscriberRepo.findOne.mockResolvedValue({
        id: 'sub-1',
        username: 'testuser',
        passwordHash: hash,
        enabled: true,
        tenantId: 'tenant-1',
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
        plan: { name: '10Mbps Unlimited' },
      });

      const result = await service.loginSubscriber('testuser', 'test123');

      expect(result).toHaveProperty('access_token');
      expect(result.user.role).toBe('subscriber');
      expect(result.user.planName).toBe('10Mbps Unlimited');
    });

    it('should throw for unknown subscriber', async () => {
      subscriberRepo.findOne.mockResolvedValue(null);
      await expect(service.loginSubscriber('nobody', 'pass')).rejects.toThrow(UnauthorizedException);
    });

    it('should throw for disabled subscriber', async () => {
      const hash = await bcrypt.hash('pass', 10);
      subscriberRepo.findOne.mockResolvedValue({
        id: 'sub-1', username: 'user', passwordHash: hash, enabled: false,
      });
      await expect(service.loginSubscriber('user', 'pass')).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('refreshToken', () => {
    it('should throw for invalid refresh token type', async () => {
      jwtService.verify.mockReturnValue({ sub: 'mgr-1', type: 'access', role: 'admin', tenantId: 't1' });
      await expect(service.refreshToken('bad.token')).rejects.toThrow(UnauthorizedException);
    });

    it('should return new tokens for valid refresh token', async () => {
      jwtService.verify.mockReturnValue({ sub: 'mgr-1', type: 'refresh', role: 'admin', tenantId: 't1' });
      managerRepo.findOne.mockResolvedValue({
        id: 'mgr-1', username: 'admin', enabled: true, permissions: {},
      });

      const result = await service.refreshToken('valid.refresh.token');
      expect(result).toHaveProperty('access_token');
      expect(result).toHaveProperty('refresh_token');
    });
  });
});
