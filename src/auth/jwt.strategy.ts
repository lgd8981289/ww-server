import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService) {
    // 调用父类构造函数，传入 JWT 策略的配置
    super({
      // 从请求的Authorization头中提取 JWT，使用 Bearer 方案，也就是 Authorization: Bearer <token>
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),

      // 是否忽略 JWT 的过期时间，默认为 false，表示过期的 JWT 将被拒绝
      ignoreExpiration: false,

      // 用于验证 JWT 的签名的密钥，通常从环境变量或配置文件中获取
      secretOrKey: configService.get<string>('JWT_SECRET') || 'wwzhidao-secret',
    });
  }

  // JWT 验证方法，当 JWT 验证成功后会调用这个方法，payload 是从 JWT 中解析出来的有效载荷
  validate(payload: any) {
    if (!payload.userId) {
      throw new UnauthorizedException('Token 无效');
    }

    return {
      userId: payload.userId, // 用户ID
      username: payload.username, // 用户名
      email: payload.email, // 用户邮箱
    };
  }
}
