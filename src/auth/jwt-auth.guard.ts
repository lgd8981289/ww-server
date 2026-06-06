/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';

// JwtAuthGuard 是一个自定义的认证守卫，它继承了 Passport 的 AuthGuard，并指定了 'jwt' 作为认证策略。这意味着当我们在控制器中使用 @UseGuards(JwtAuthGuard) 时，NestJS 会使用 JwtStrategy 来验证请求中的 JWT Token 是否有效。如果 JWT 验证成功，JwtStrategy 的 validate 方法会被调用，并将解析出的用户信息附加到请求对象的 user 属性上，这样我们就可以在控制器中通过 req.user 来访问用户信息了。
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  // 在 JwtAuthGuard 的构造函数中，我们注入了 Reflector，这样我们就可以在 JwtAuthGuard 中使用 this.Reflector 来访问反射器实例。反射器是 NestJS 提供的一个工具类，它允许我们在运行时获取和设置元数据，这对于实现一些基于装饰器的功能非常有用。
  constructor(private Reflector: Reflector) {
    super(); // 调用父类的构造函数来初始化 AuthGuard
  }

  // 使用反射器来检查当前请求的处理函数和控制器类上是否有 @Public() 装饰器标记，如果有的话，我们就直接返回 true，允许这个请求通过认证检查。否则，我们就调用父类的 canActivate 方法来执行正常的 JWT 认证流程。
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    // 获取当前处理请求的路由处理函数和控制器类上是否有 'isPublic' 元数据，如果有的话就返回 true，否则返回 false。
    const isPublic = this.Reflector.getAllAndOverride('isPublic', [
      context.getHandler(), // 获取当前处理请求的路由处理函数
      context.getClass(), // 获取当前处理请求的控制器类
    ]);

    // 如果 isPublic 为 true，说明这个接口被 @Public() 装饰器标记为公共接口，我们就直接返回 true，允许这个请求通过认证检查。
    if (isPublic) {
      return true; // 允许公共接口通过认证检查
    }
    // 否则，我们就调用父类的 canActivate 方法来执行正常的 JWT 认证流程。
    return super.canActivate(context);
  }

  // 当认证失败时，我们抛出一个 UnauthorizedException 异常，并将认证失败的错误信息作为异常消息返回给客户端。
  handleRequest<TUser = any>(err: any, user: any, info: Error): TUser {
    if (err || !user) {
      throw new UnauthorizedException(info?.message || '认证失败');
    }
    return user;
  }
}
