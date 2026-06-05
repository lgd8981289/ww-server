import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

// 定义 UserDocument 类型，表示 User 类的实例加上 Mongoose 的 Document 类型，这样我们就可以在代码中使用 UserDocument 来表示数据库中的用户文档。
export type UserDocument = User & Document;

@Schema({ timestamps: true }) // 添加时间戳
export class User {
  // TODO: 基础认证字段
  @Prop({ required: true }) // 必填字段，用户名不能为空
  username: string; // 用户名

  @Prop({ default: ['user'] }) // 默认角色为 'user'
  roles: string[]; // 角色数组，支持多角色

  @Prop({ default: false }) // 默认账户状态为未激活
  isActive: boolean; // 账户是否激活

  @Prop() // 可选字段，允许用户不设置密码
  password?: string; // 密码

  @Prop({ required: false }) // 可选字段，允许用户不设置邮箱
  email?: string; // 邮箱

  @Prop({ required: false })
  phone?: string; // 电话号码

  @Prop({ required: false })
  avatar?: string; // 头像URL

  @Prop({ required: false })
  wechatId?: string; // 微信登录唯一标识

  // TODO: 用户个人信息
  @Prop({ required: false })
  realName?: string; // 真实姓名

  @Prop({ enum: ['male', 'female', 'other'], default: 'other' }) // 性别枚举，默认值为 'other'
  gender?: 'male' | 'female' | 'other'; // 性别

  @Prop({ required: false })
  birthDate?: Date; // 生日

  @Prop({ default: false })
  isVerified: boolean; // 账户是否实名认证

  @Prop({ required: false })
  idCard?: string; // 身份证号码

  // TODO: VIP相关
  @Prop({ default: false })
  isVip: boolean; // 是否是VIP用户

  @Prop({ required: false })
  vipExpireTime?: Date; // VIP过期时间

  // TODO: 配额相关
  @Prop({ default: 0 }) // 默认配额为0
  aiInterviewRemainingCount: number; // AI面试剩余次数

  @Prop({ default: 0 })
  aiInterviewRemainingMinutes: number; // AI面试剩余分钟数

  @Prop({ default: 0 })
  wwCoinBalance: number; // 旺旺币余额

  @Prop({ default: 0 })
  resumeRemainingCount: number; // 简历押题剩余次数

  @Prop({ default: 0 })
  specialRemainingCount: number; // 专项面试剩余次数

  @Prop({ default: 0 })
  behaviorRemainingCount: number; // 综合面试剩余次数

  // TODO: 微信相关
  @Prop({ default: false })
  isWechatBound: boolean; // 是否绑定微信

  @Prop({ required: false })
  wechatBindDate?: Date; // 微信绑定日期

  @Prop({ unique: true, sparse: true }) // 微信小程序登录唯一标识，允许为空但必须唯一
  openid?: string; // 微信小程序登录唯一标识

  @Prop({ unique: true, sparse: true })
  unionid?: string; // 微信开放平台登录唯一标识

  @Prop({ required: false })
  wechatNickname?: string; // 微信昵称

  @Prop({ required: false })
  wechatAvatar?: string; // 微信头像URL

  // TODO: 用户行为追踪
  @Prop({ required: false })
  lastLoginTime?: Date; // 上次登录时间

  @Prop({ required: false })
  lastLoginLocation?: string; // 上次登录地点

  // TODO: (并非TODO) 时间戳（mongoose已经自动添加）
  // createdAt: Date; // 创建时间
  // updatedAt: Date; // 更新时间
}

// SchemaFactory.createForClass() 方法会根据 User 类自动生成 Mongoose 模式，并且会根据 @Prop() 装饰器的配置来设置字段属性。
export const UserSchema = SchemaFactory.createForClass(User);
