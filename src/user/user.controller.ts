import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserService } from './user.service';
import { RegisterDto } from './dto/register.dto';
import { ResponseUtil } from 'src/common/utils/response.util';

@ApiTags('用户')
@Controller('user')
export class UserController {
  // 使用构造函数注入 UserService，这样我们就可以在 UserController 中使用 this.userService 来调用用户相关的服务方法。
  constructor(private readonly userService: UserService) {}

  @ApiOperation({ summary: '用户注册' })
  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    // 使用 @Body() 装饰器来接收请求体中的 RegisterDto 数据，这样我们就可以在 register 方法中直接使用 registerDto 来访问用户注册信息。
    const result = await this.userService.register(registerDto);
    return ResponseUtil.success(result, '注册成功');
  }
}
