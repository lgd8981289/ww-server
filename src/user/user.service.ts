import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument, UserSchema } from './schemas/user.schema';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { NotFoundException } from '@nestjs/common';
import {
  ConsumptionRecord,
  ConsumptionRecordDocument,
} from '../interview/schemas/consumption-record.schema';
import {
  UserConsumption,
  UserConsumptionDocument,
} from './schemas/consumption-record.schema';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UserService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(ConsumptionRecord.name)
    private consumptionRecordModel: Model<ConsumptionRecordDocument>,
    @InjectModel(UserConsumption.name)
    private consumptionModel: Model<UserConsumptionDocument>,
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

  /**
   * 获取用户信息
   */
  async getUserInfo(userId: string) {
    const user = await this.userModel.findById(userId).lean();
    if (!user) {
      throw new NotFoundException('用户不存在');
    }
    // 不返回密码
    delete user.password;

    return user;
  }

  async updateUser(userId: string, updateUserDto: UpdateUserDto) {
    // 如果更新邮箱，检查邮箱是否已被使用
    if (updateUserDto.email) {
      const existingUser = await this.userModel.findOne({
        email: updateUserDto.email,
        _id: { $ne: userId }, // 排除当前用户
      });

      if (existingUser) {
        throw new BadRequestException('邮箱已被使用');
      }
    }

    const user = await this.userModel.findByIdAndUpdate(userId, updateUserDto, {
      new: true,
    });

    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    delete user.password;
    return user;
  }

  /**
   * 创建消费记录
   */
  async createConsumptionRecord(
    userId: string,
    type: string,
    quantity: number = 1,
    source: string = 'free',
    relatedId?: string,
  ) {
    const record = new this.consumptionModel({
      userId,
      type,
      quantity,
      source,
      relatedId,
    });

    return await record.save();
  }

  /**
   * 获取用户消费记录
   * @param userId - 用户的唯一标识
   * @param options - 可选的查询参数，包括跳过的记录数和限制的记录数
   * @returns - 返回用户的消费记录和消费统计数据
   */
  async getUserConsumptionRecords(
    userId: string, // 用户ID，用于标识和查询特定用户的消费记录
    options?: { skip: number; limit: number }, // 查询选项，包含跳过记录的数量和每次查询的记录数量
  ) {
    // 如果没有传递查询选项，则默认跳过0条记录，并限制返回20条记录
    const skip = options?.skip || 0; // 从第skip条记录开始
    const limit = options?.limit || 20; // 限制返回的记录数量，默认是20

    // 查询消费记录，按创建时间降序排列，跳过skip条记录，限制返回limit条记录
    const records = await this.consumptionRecordModel
      .find({ userId }) // 根据用户ID查询消费记录
      .sort({ createdAt: -1 }) // 按照创建时间降序排列，最新的记录排在前面
      .skip(skip) // 跳过指定数量的记录
      .limit(limit) // 限制返回的记录数量
      .lean(); // 使用lean()优化查询结果，返回普通的JavaScript对象而不是Mongoose文档

    // 统计用户各类型的消费信息，使用MongoDB的聚合框架
    const stats = await this.consumptionRecordModel.aggregate([
      { $match: { userId } }, // 过滤出属于当前用户的消费记录
      {
        $group: {
          // 按照消费类型进行分组
          _id: '$type', // 按消费类型进行分组
          count: { $sum: 1 }, // 统计每种类型的消费记录数量
          successCount: {
            $sum: { $cond: [{ $eq: ['$status', 'success'] }, 1, 0] }, // 统计状态为'success'的记录数
          },
          failedCount: {
            $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] }, // 统计状态为'failed'的记录数
          },
          totalCost: { $sum: '$estimatedCost' }, // 计算每种类型的消费总额
        },
      },
    ]);

    // 返回查询的消费记录和消费统计信息
    return {
      records, // 用户的消费记录
      stats, // 按消费类型分组后的统计信息
    };
  }
}
