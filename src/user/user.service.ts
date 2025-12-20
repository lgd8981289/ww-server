import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument, UserSchema } from './schemas/user.schema';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class UserService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private jwtService: JwtService,
  ) {}

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

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    // 1. 找用户
    const user = await this.userModel.findOne({ email });
    if (!user) {
      throw new UnauthorizedException('邮箱或密码不正确');
    }

    // 2. 验证密码
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('邮箱或密码不正确');
    }

    // 3. 生成 Token
    const token = this.jwtService.sign({
      userId: user._id.toString(),
      username: user.username,
      email: user.email,
    });

    // 4. 返回 Token 和用户信息
    const userInfo = user.toObject();
    delete userInfo.password;

    return {
      token,
      user: userInfo,
    };
  }
}
