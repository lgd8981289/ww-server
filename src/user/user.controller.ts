/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import {
  Body,
  Controller,
  Get,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserService } from './user.service';
import { RegisterDto } from './dto/register.dto';
import { ResponseUtil } from 'src/common/utils/response.util';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { Public } from '../auth/public.decorator';

@ApiTags('用户')
@Controller('user')
@UseGuards(JwtAuthGuard) // 使用 JwtAuthGuard 来保护用户相关的接口，只有通过 JWT 验证的请求才能访问这些接口
export class UserController {
  // 使用构造函数注入 UserService，这样我们就可以在 UserController 中使用 this.userService 来调用用户相关的服务方法。
  constructor(private readonly userService: UserService) {}

  @ApiOperation({ summary: '用户注册' })
  @Post('register')
  @Public() // 使用 @Public() 装饰器来标记这个接口为公共接口，这样 JwtAuthGuard 就会跳过这个接口的认证检查，允许未认证的用户访问注册接口。
  async register(@Body() registerDto: RegisterDto) {
    // 使用 @Body() 装饰器来接收请求体中的 RegisterDto 数据，这样我们就可以在 register 方法中直接使用 registerDto 来访问用户注册信息。
    const result = await this.userService.register(registerDto);
    return ResponseUtil.success(result, '注册成功');
  }

  @ApiOperation({ summary: '用户登录' })
  @Post('login')
  @Public()
  async login(@Body() loginDto: LoginDto) {
    const result = await this.userService.login(loginDto);
    return ResponseUtil.success(result, '登录成功');
  }

  @ApiOperation({ summary: '获取用户信息' })
  @ApiBearerAuth() // 使用 ApiBearerAuth 装饰器来标记这个接口需要使用 Bearer Token 进行认证，这样在 Swagger UI 中就会显示一个输入框让用户输入 JWT Token。
  @Get('info')
  async getInfo(@Request() req: any) {
    const { userId } = req.user; // 从请求对象中获取用户信息，req.user 是 JwtStrategy 中 validate 方法返回的用户信息
    const userInfo = await this.userService.getUserInfo(userId);
    return ResponseUtil.success(userInfo, '获取用户信息成功');
  }
}
