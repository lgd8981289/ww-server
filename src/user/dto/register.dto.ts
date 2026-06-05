import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ description: '用户名', minLength: 3, example: 'testuser' })
  @IsString()
  @MinLength(3) // 最小长度为3
  username: string; // 用户名

  @ApiProperty({ description: '密码', minLength: 6, example: '123456' })
  @IsString()
  @MinLength(6)
  password: string; // 密码

  @ApiProperty({ description: '邮箱', example: 'test@example.com' })
  @IsEmail() // 验证邮箱格式
  email: string; // 邮箱
}
