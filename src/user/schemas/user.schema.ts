import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

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
