// 导入所需的模块和服务
import { ExecutionContext, Injectable } from '@nestjs/common'; // ExecutionContext 用于获取请求上下文，Injectable 用于将类标记为可注入的
import { Reflector } from '@nestjs/core'; // Reflector 用于从元数据中获取装饰器信息
import { AuthGuard } from '@nestjs/passport'; // AuthGuard 是 Passport 的基础类，用于实现认证守卫
import { IS_PUBLIC_KEY } from './public.decorator'; // 引入自定义的装饰器键，用于标识公开接口
import { UnauthorizedException } from '@nestjs/common'; // UnauthorizedException 用于抛出未授权的异常

// 使用@Injectable装饰器，表示该类是可注入的，可以由NestJS的依赖注入系统管理
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  // 构造函数接收Reflector实例，用于反射获取装饰器元数据
  constructor(private reflector: Reflector) {
    super(); // 调用父类AuthGuard构造函数，传入'jwt'策略
  }

  // canActivate方法用于判断是否允许请求通过（是否有权限访问该接口）
  canActivate(context: ExecutionContext) {
    // 使用Reflector从当前请求的处理方法和类中提取公开接口的元数据
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(), // 获取当前处理方法的元数据
      context.getClass(), // 获取当前类的元数据
    ]);

    // 如果接口被标记为公开接口，直接允许通过
    if (isPublic) {
      return true; // 公开接口，不需要验证Token，直接返回true
    }

    // 否则，执行父类AuthGuard的canActivate方法，进行JWT认证
    return super.canActivate(context); // 调用父类的方法，继续进行JWT验证
  }

  handleRequest(err, user, info: Error) {
    if (err || !user) {
      throw new UnauthorizedException(info?.message || '无效的 Token');
    }
    return user;
  }
}
