import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import bcrypt from 'bcryptjs';

export type UserDocument = User &
  Document & {
    comparePassword(candidatePassword: string): Promise<boolean>;
  };

@Schema({ timestamps: true })
export class User {
  // 基础认证字段
  @Prop({ required: true })
  username: string;

  @Prop({ required: false })
  wechatId: string; // 微信登录的唯一标识

  @Prop({ required: false })
  email?: string;

  @Prop({ required: false })
  phone: string;

  @Prop()
  avatar?: string;

  @Prop({ default: ['user'] })
  roles: string[]; // 角色数组，支持多角色

  @Prop({ default: false })
  isActive: boolean; // 账号是否激活

  @Prop()
  password?: string;

  // 用户个人信息
  @Prop()
  realName?: string; // 真实姓名

  @Prop({ enum: ['male', 'female', 'other'], default: 'other' })
  gender?: 'male' | 'female' | 'other'; // 性别

  @Prop()
  idCard?: string; // 身份证号

  @Prop({ default: false })
  isVerified: boolean; // 是否实名认证

  @Prop()
  birthDate?: Date; // 出生年月日

  // VIP 相关
  @Prop({ default: false })
  isVip: boolean; // 是否为会员

  @Prop()
  vipExpireTime?: Date; // 会员过期时间

  // 配额相关（这很关键）
  @Prop({ default: 0 })
  aiInterviewRemainingCount: number; // AI模拟面试剩余次数

  @Prop({ default: 0 })
  aiInterviewRemainingMinutes: number; // AI模拟面试剩余时间（分钟）

  @Prop({ default: 0 })
  wwCoinBalance: number; // 旺旺币余额

  @Prop({ default: 0 })
  resumeRemainingCount: number; // 简历押题剩余次数

  @Prop({ default: 0 })
  specialRemainingCount: number; // 专项面试剩余次数

  @Prop({ default: 0 })
  behaviorRemainingCount: number; // 综合面试剩余次数

  // 用户行为追踪
  @Prop()
  lastLoginTime?: Date; // 最近登录时间

  @Prop()
  lastLoginLocation?: string; // 最近登录地点

  // 微信相关字段
  @Prop({ unique: true, sparse: true })
  openid?: string; // 微信用户的唯一标识（小程序）

  @Prop({ unique: true, sparse: true })
  unionid?: string; // 微信开放平台统一标识

  @Prop()
  wechatNickname?: string; // 微信昵称

  @Prop()
  wechatAvatar?: string; // 微信头像

  @Prop({ default: false })
  isWechatBound: boolean; // 是否绑定微信

  @Prop()
  wechatBoundTime?: Date; // 微信绑定时间

  // 时间戳（自动添加）
  // createdAt: Date;
  // updatedAt: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);

// 保存前加密密码
UserSchema.pre('save', async function () {
  if (!this.isModified('password')) {
    return;
  }

  const salt = await bcrypt.genSalt(10);
  if (this.password) {
    this.password = await bcrypt.hash(this.password, salt);
  }
});

// 添加比较密码的方法
UserSchema.methods.comparePassword = async function (
  candidatePassword: string,
) {
  return await bcrypt.compare(candidatePassword, this.password);
};
