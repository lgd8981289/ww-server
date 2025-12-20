import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes } from 'mongoose';

export type UserConsumptionDocument = UserConsumption & Document;

@Schema({ timestamps: true })
export class UserConsumption {
  @Prop({ type: SchemaTypes.ObjectId, ref: 'User', required: true })
  userId: string;

  @Prop({ enum: ['interview', 'quiz', 'other'], default: 'interview' })
  type: string; // 消费类型

  @Prop({ default: 1 })
  quantity: number; // 消费数量（次数或金额）

  @Prop({ enum: ['free', 'paid'], default: 'free' })
  source: string; // 来源：免费配额或付费

  @Prop({ default: null })
  relatedId?: string; // 关联的面试 ID

  @Prop({ default: null })
  description?: string; // 描述

  @Prop({ default: true })
  success: boolean; // 是否成功
}

export const UserConsumptionSchema =
  SchemaFactory.createForClass(UserConsumption);
