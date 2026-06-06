import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
// JwtAuthGuard 是一个自定义的认证守卫，它继承了 Passport 的 AuthGuard，并指定了 'jwt' 作为认证策略。这意味着当我们在控制器中使用 @UseGuards(JwtAuthGuard) 时，NestJS 会使用 JwtStrategy 来验证请求中的 JWT Token 是否有效。如果 JWT 验证成功，JwtStrategy 的 validate 方法会被调用，并将解析出的用户信息附加到请求对象的 user 属性上，这样我们就可以在控制器中通过 req.user 来访问用户信息了。
