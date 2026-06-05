import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class UserService {
  // 使用 @InjectModel() 装饰器来注入 User 模型，这样我们就可以在 UserService 中使用 this.userModel 来操作用户数据。
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

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
}
