import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class UserService {
  // 使用 @InjectModel() 装饰器来注入 User 模型，这样我们就可以在 UserService 中使用 this.userModel 来操作用户数据。
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private jwtService: JwtService, // 注入 JwtService 来生成 JWT Token
  ) {}

  // TODO: 用户注册服务：接收 RegisterDto 数据，创建新用户，并保存到数据库中。
  async register(RegisterDto: RegisterDto): Promise<User> {
    const { username, password, email } = RegisterDto;

    // 检测用户名是否已存在
    const existingUser = await this.userModel.findOne({
      // $or 操作符用于在 MongoDB 查询中指定多个条件，只要满足其中一个条件即可匹配到文档。
      $or: [{ username }, { email }],
    });
    if (existingUser) {
      throw new BadRequestException('用户名或邮箱已存在');
    }

    // 创建新用户
    const newUser = new this.userModel({
      username,
      password,
      email,
    });

    // 保存新用户到数据库
    await newUser.save();

    // 返回新创建的用户对象，但不包含密码字段，以保护用户隐私。
    const result = newUser.toObject();
    delete result.password;
    return result;
  }

  // TODO: 用户登录服务：接收 LoginDto 数据，验证用户身份，并返回用户信息（不包含密码）。
  async login(loginDto: LoginDto): Promise<{ token: string; user: any }> {
    const { email, password } = loginDto;

    // 根据邮箱查找用户
    const user = await this.userModel.findOne({ email });
    if (!user || !user.password) {
      throw new UnauthorizedException('邮箱或密码不正确');
    }

    // 验证密码
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('邮箱或密码不正确');
    }

    // 生成 Token
    const token = this.jwtService.sign({
      userId: user._id.toString(),
      username: user.username,
      email: user.email,
    });

    // 返回用户信息和 Token
    const result = user.toObject();
    delete result.password; // 删除密码字段以保护用户隐私
    return { token, user: result };
  }
}
