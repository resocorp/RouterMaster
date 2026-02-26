import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { Manager } from '../managers/entities/manager.entity';
import { Subscriber } from '../subscribers/entities/subscriber.entity';
import { Tenant } from '../settings/entities/tenant.entity';
import { JwtPayload } from '../../common/decorators/current-user.decorator';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(Manager)
    private readonly managerRepo: Repository<Manager>,
    @InjectRepository(Subscriber)
    private readonly subscriberRepo: Repository<Subscriber>,
    @InjectRepository(Tenant)
    private readonly tenantRepo: Repository<Tenant>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async loginAdmin(username: string, password: string) {
    const manager = await this.managerRepo.findOne({
      where: { username },
      relations: ['tenant'],
    });
    if (!manager) {
      throw new UnauthorizedException('Invalid credentials');
    }
    if (!manager.enabled) {
      throw new UnauthorizedException('Account disabled');
    }
    if (!manager.tenant?.enabled) {
      throw new UnauthorizedException('Tenant disabled');
    }

    const valid = await bcrypt.compare(password, manager.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload: JwtPayload = {
      sub: manager.id,
      username: manager.username,
      role: manager.isSuper ? 'admin' : 'manager',
      tenantId: manager.tenantId,
      permissions: manager.isSuper ? undefined : manager.permissions,
    };

    this.logger.log(`Admin login: ${manager.username} (${payload.role})`);

    return {
      access_token: this.jwtService.sign(payload, {
        expiresIn: this.configService.get('JWT_ACCESS_EXPIRY', '15m'),
      }),
      refresh_token: this.jwtService.sign(
        { sub: manager.id, type: 'refresh', role: payload.role, tenantId: manager.tenantId },
        { expiresIn: this.configService.get('JWT_REFRESH_EXPIRY', '7d') },
      ),
      user: {
        id: manager.id,
        username: manager.username,
        role: payload.role,
        firstName: manager.firstName,
        lastName: manager.lastName,
        email: manager.email,
        tenantId: manager.tenantId,
      },
    };
  }

  async loginSubscriber(username: string, password: string) {
    const subscriber = await this.subscriberRepo.findOne({
      where: { username },
      relations: ['plan'],
    });
    if (!subscriber) {
      throw new UnauthorizedException('Invalid credentials');
    }
    if (!subscriber.enabled) {
      throw new UnauthorizedException('Account disabled');
    }

    let valid = false;
    if (subscriber.passwordPlain) {
      valid = password === subscriber.passwordPlain;
    } else {
      valid = await bcrypt.compare(password, subscriber.passwordHash);
    }
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload: JwtPayload = {
      sub: subscriber.id,
      username: subscriber.username,
      role: 'subscriber',
      tenantId: subscriber.tenantId,
    };

    this.logger.log(`Subscriber login: ${subscriber.username}`);

    return {
      access_token: this.jwtService.sign(payload, {
        expiresIn: this.configService.get('JWT_ACCESS_EXPIRY', '15m'),
      }),
      refresh_token: this.jwtService.sign(
        { sub: subscriber.id, type: 'refresh', role: 'subscriber', tenantId: subscriber.tenantId },
        { expiresIn: this.configService.get('JWT_REFRESH_EXPIRY', '7d') },
      ),
      user: {
        id: subscriber.id,
        username: subscriber.username,
        role: 'subscriber',
        firstName: subscriber.firstName,
        lastName: subscriber.lastName,
        email: subscriber.email,
        planName: subscriber.plan?.name,
        tenantId: subscriber.tenantId,
      },
    };
  }

  async refreshToken(refreshToken: string) {
    try {
      const decoded = this.jwtService.verify(refreshToken);
      if (decoded.type !== 'refresh') {
        throw new UnauthorizedException('Invalid refresh token');
      }

      let user: any;
      if (decoded.role === 'subscriber') {
        user = await this.subscriberRepo.findOne({ where: { id: decoded.sub } });
      } else {
        user = await this.managerRepo.findOne({ where: { id: decoded.sub } });
      }

      if (!user || !user.enabled) {
        throw new UnauthorizedException('User not found or disabled');
      }

      const payload: JwtPayload = {
        sub: user.id,
        username: user.username,
        role: decoded.role,
        tenantId: decoded.tenantId,
        permissions: decoded.role === 'manager' ? user.permissions : undefined,
      };

      return {
        access_token: this.jwtService.sign(payload, {
          expiresIn: this.configService.get('JWT_ACCESS_EXPIRY', '15m'),
        }),
        refresh_token: this.jwtService.sign(
          { sub: user.id, type: 'refresh', role: decoded.role, tenantId: decoded.tenantId },
          { expiresIn: this.configService.get('JWT_REFRESH_EXPIRY', '7d') },
        ),
      };
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  async getProfile(user: JwtPayload) {
    if (user.role === 'subscriber') {
      const subscriber = await this.subscriberRepo.findOne({
        where: { id: user.sub },
        relations: ['plan', 'group'],
      });
      if (!subscriber) throw new UnauthorizedException('User not found');
      const { passwordHash, passwordPlain, ...result } = subscriber;
      return result;
    } else {
      const manager = await this.managerRepo.findOne({
        where: { id: user.sub },
      });
      if (!manager) throw new UnauthorizedException('User not found');
      const { passwordHash, ...result } = manager;
      return result;
    }
  }
}
