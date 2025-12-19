import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import * as bcrypt from 'bcryptjs';

@Schema({ _id: false })
export class Profile {
  @Prop()
  bio: string;

  @Prop()
  phone: string;

  @Prop()
  avatar: string; // 头像URL
}

const ProfileSchema = SchemaFactory.createForClass(Profile);

@Schema({
  timestamps: true,
  toJSON: { virtuals: true },
})
export class User extends Document {
  @Prop({
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    minlength: 3,
    maxlength: 20,
    index: true,
  })
  username: string;

  @Prop({
    required: true,
    unique: true,
    lowercase: true,
    match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  })
  email: string;

  @Prop({
    required: true,
    minlength: 6,
  })
  password: string;

  @Prop({
    type: ProfileSchema,
  })
  profile: Profile;

  @Prop({
    type: [String],
    default: [],
  })
  tags: string[];

  @Prop({
    type: String,
    enum: ['active', 'inactive', 'banned'],
    default: 'active',
    index: true,
  })
  status: string;

  @Prop({
    type: Boolean,
    default: false,
  })
  isAdmin: boolean;

  @Prop({
    type: Number,
    default: 0,
  })
  loginCount: number;

  @Prop()
  lastLoginAt: Date;

  // 虚拟字段：账号是否处于活跃状态
  readonly isActive: boolean;
}

export const UserSchema = SchemaFactory.createForClass(User);

// 添加虚拟字段
UserSchema.virtual('isActive').get(function () {
  return this.status === 'active';
});

// 创建索引
UserSchema.index({ username: 1, email: 1 });
UserSchema.index({ status: 1 });

// Pre save 钩子：加密密码
UserSchema.pre('save', async function (next: (err?: Error) => void) {
  if (!this.isModified('password')) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error as Error);
  }
});

// Post save 钩子：记录日志
UserSchema.post('save', function () {
  console.log(`用户 ${this.username} 已保存`);
});

// Pre findOneAndUpdate 钩子：自动更新时间戳
UserSchema.pre('findOneAndUpdate', function (next: (err?: Error) => void) {
  this.set({ updatedAt: new Date() });
  next();
});

// 添加方法：比对密码
UserSchema.methods.comparePassword = async function (password: string) {
  return bcrypt.compare(password, this.password);
};

// 添加方法：隐藏敏感字段
UserSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password; // 不返回密码
  return obj;
};
