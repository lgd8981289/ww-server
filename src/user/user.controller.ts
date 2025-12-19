import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  Request,
} from '@nestjs/common';
import { UserService } from './user.service';
import { User } from './schemas/user.schema';
import { UseInterceptors } from '@nestjs/common';
import { LoggingInterceptor } from '../common/interceptors/logging.interceptor';
import { CreateUserDto } from './dto/create-user.dto';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.guard';
import { NotFoundException } from '@nestjs/common';

@Controller('user')
// 使用日志拦截器（控制器级别拦截器）
@UseInterceptors(LoggingInterceptor)
// @UseGuards(JwtAuthGuard) // 所有路由都需要认证
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  findAll(): Promise<User[]> {
    return this.userService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number): Promise<User | null> {
    if (id > 100) {
      throw new NotFoundException(`用户 ID ${id} 不存在`);
    }
    return this.userService.findOne(id.toString());
  }

  @Get('error')
  testError() {
    throw new Error('这是一个测试错误');
  }

  @Post()
  create(@Body() createUserDto: CreateUserDto): Promise<User> {
    return this.userService.create(createUserDto);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateUserDto: { name?: string; email?: string },
  ): Promise<User | null> {
    return this.userService.update(id.toString(), updateUserDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number): Promise<User | null> {
    return this.userService.delete(id.toString());
  }

  @Get('info')
  getInfo(@Request() req: any) {
    return req.user;
  }

  @Get('admin')
  @UseGuards(RolesGuard)
  @Roles('admin')
  getAdminInfo(@Request() req: any) {
    // 只有 admin 角色可以访问
    return { message: '管理员信息', user: req.user };
  }
}
