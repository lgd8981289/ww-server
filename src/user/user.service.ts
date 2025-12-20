import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from './schemas/user.schema';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class UserService {
  constructor(@InjectModel(User.name) private userModel: Model<User>) {}

  async register(registerDto: RegisterDto) {
    const { username, email, password } = registerDto;

    // 检查用户名是否已存在
    const existingUser = await this.userModel.findOne({
      $or: [{ username }, { email }],
    });

    if (existingUser) {
      throw new BadRequestException('用户名或邮箱已存在');
    }

    // 创建新用户
    // 密码加密会在 Schema 的 pre('save') 钩子里自动进行
    const newUser = new this.userModel({
      username,
      email,
      password,
    });

    await newUser.save();

    // 返回用户信息（不返回密码）
    const result = newUser.toObject();
    delete result.password;

    return result;
  }
}
