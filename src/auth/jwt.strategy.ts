import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') || 'wwzhidao-secret',
    });
  }

  async validate(payload: any) {
    if (!payload.userId) {
      throw new UnauthorizedException('Token 无效');
    }

    return {
      userId: payload.userId,
      username: payload.username,
      roles: payload.roles || ['user'],
    };
  }
}
