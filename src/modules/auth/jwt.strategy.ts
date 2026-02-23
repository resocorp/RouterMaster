import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { JwtPayload } from '../../common/decorators/current-user.decorator';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET', 'change-this-in-production'),
    });
  }

  async validate(payload: any): Promise<JwtPayload> {
    if (!payload.sub || !payload.role || !payload.tenantId) {
      throw new UnauthorizedException('Invalid token payload');
    }
    return {
      sub: payload.sub,
      username: payload.username,
      role: payload.role,
      tenantId: payload.tenantId,
      permissions: payload.permissions,
    };
  }
}
