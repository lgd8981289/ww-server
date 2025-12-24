import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types, Schema as MongooseSchema } from 'mongoose';

export type AIInterviewResultDocument = AIInterviewResult & Document;

/**
 * 面试类型枚举
 */
export enum AIInterviewType {
  SPECIAL = 'special', // 专项面试
  BEHAVIOR = 'behavior', // 综合面试（行为面试+HR面试）
}

/**
 * STAR模型评分
 */
@Schema({ _id: false })
export class STARAnalysis {
  @Prop()
  situation?: number; // 情境描述得分 (0-100)

  @Prop()
  task?: number; // 任务说明得分 (0-100)

  @Prop()
  action?: number; // 行动措施得分 (0-100)

  @Prop()
  result?: number; // 结果呈现得分 (0-100)

  @Prop()
  overallScore?: number; // STAR整体得分 (0-100)

  @Prop()
  feedback?: string; // 反馈建议
}

export const STARAnalysisSchema = SchemaFactory.createForClass(STARAnalysis);

/**
 * 单个问答记录
 */
@Schema({ _id: false })
export class InterviewQA {
  @Prop({ required: true })
  question: string; // 问题内容

  @Prop({ required: true })
  answer: string; // 候选人的回答

  @Prop()
  standardAnswer?: string; // 标准答案/参考答案

  @Prop()
  answerDuration?: number; // 回答时长（秒）

  @Prop()
  audioUrl?: string; // 录音URL（如果有）

  @Prop()
  videoUrl?: string; // 视频URL（如果有）

  @Prop({ type: Number, min: 0, max: 100 })
  score?: number; // 单题得分 (0-100)

  @Prop({ type: STARAnalysisSchema })
  starAnalysis?: STARAnalysis; // STAR模型分析

  @Prop()
  aiComment?: string; // AI点评

  @Prop({ type: [String], default: [] })
  highlights?: string[]; // 亮点

  @Prop({ type: [String], default: [] })
  improvements?: string[]; // 需要改进的点

  @Prop()
  askedAt?: Date; // 问题生成时间（AI开始生成时的时间）

  @Prop()
  answeredAt?: Date; // 回答时间

  @Prop()
  savedAt?: Date; // 保存时间（用于实时保存）
}

export const InterviewQASchema = SchemaFactory.createForClass(InterviewQA);

/**
 * 雷达图维度数据
 */
@Schema({ _id: false })
export class RadarDimension {
  @Prop({ required: true })
  dimension: string; // 维度名称（如：技术能力、沟通能力等）

  @Prop({ required: true, type: Number, min: 0, max: 100 })
  score: number; // 得分 (0-100)

  @Prop()
  description?: string; // 维度说明
}

export const RadarDimensionSchema =
  SchemaFactory.createForClass(RadarDimension);

/**
 * 改进建议
 */
@Schema({ _id: false })
export class ImprovementSuggestion {
  @Prop({ required: true })
  category: string; // 类别（如：技术深度、表达能力等）

  @Prop({ required: true })
  suggestion: string; // 具体建议

  @Prop({ enum: ['high', 'medium', 'low'], default: 'medium' })
  priority?: string; // 优先级
}

export const ImprovementSuggestionSchema = SchemaFactory.createForClass(
  ImprovementSuggestion,
);

/**
 * AI面试结果 Schema（专项面试 + 综合面试）
 */
@Schema({ timestamps: true })
export class AIInterviewResult {
  @Prop({ required: true, unique: true })
  resultId: string; // 结果唯一ID

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  })
  user: Types.ObjectId; // 关联用户

  @Prop({ required: true, index: true })
  userId: string; // 用户ID

  @Prop({ required: true, enum: AIInterviewType, index: true })
  interviewType: AIInterviewType; // 面试类型

  // ============ 输入信息 ============
  @Prop()
  company?: string; // 目标公司

  @Prop()
  position?: string; // 目标岗位

  @Prop()
  salaryRange?: string; // 薪资范围

  @Prop({ type: String })
  jobDescription?: string; // 职位描述（JD）

  @Prop()
  interviewDuration?: number; // 面试时长（分钟）

  @Prop()
  interviewMode?: string; // 面试模式（视频/语音/文字）

  // ============ 面试内容 ============
  @Prop({ type: [InterviewQASchema], default: [] })
  qaList: InterviewQA[]; // 问答列表

  @Prop()
  totalQuestions?: number; // 总问题数

  @Prop()
  answeredQuestions?: number; // 已回答问题数

  // ============ 综合评分 ============
  @Prop({ type: Number, min: 0, max: 100 })
  overallScore?: number; // 综合评分 (0-100)

  @Prop()
  overallLevel?: string; // 综合水平（优秀/良好/中等/需提升）

  @Prop()
  overallComment?: string; // 综合评价

  // ============ 雷达图数据 ============
  @Prop({ type: [RadarDimensionSchema], default: [] })
  radarData: RadarDimension[]; // 雷达图维度数据

  // ============ 改进建议 ============
  @Prop({ type: [ImprovementSuggestionSchema], default: [] })
  improvements: ImprovementSuggestion[]; // 改进建议

  // ============ 优秀表现 ============
  @Prop({ type: [String], default: [] })
  strengths?: string[]; // 优秀表现

  @Prop({ type: [String], default: [] })
  weaknesses?: string[]; // 薄弱环节

  // ============ 其他分析 ============
  @Prop()
  avgResponseTime?: number; // 平均回答时长（秒）

  @Prop()
  maxResponseTime?: number; // 最长回答时长（秒）

  @Prop()
  minResponseTime?: number; // 最短回答时长（秒）

  @Prop({ type: Number })
  fluencyScore?: number; // 表达流畅度 (0-100)

  @Prop({ type: Number })
  logicScore?: number; // 逻辑性 (0-100)

  @Prop({ type: Number })
  professionalScore?: number; // 专业性 (0-100)

  // ============ 用户交互 ============
  @Prop({ default: 0 })
  viewCount: number; // 查看次数

  @Prop()
  lastViewedAt?: Date; // 最后查看时间

  @Prop({ type: Number, min: 1, max: 5 })
  rating?: number; // 用户评分 1-5星

  @Prop()
  feedback?: string; // 用户反馈

  @Prop()
  ratedAt?: Date; // 评分时间

  // ============ 状态管理 ============
  @Prop({
    enum: ['in_progress', 'paused', 'completed', 'abandoned'],
    default: 'in_progress',
    index: true,
  })
  status: string; // 面试状态：进行中/暂停/已完成/已放弃

  @Prop()
  pausedAt?: Date; // 暂停时间

  @Prop()
  resumedAt?: Date; // 恢复时间

  @Prop()
  completedAt?: Date; // 完成时间

  @Prop({ type: MongooseSchema.Types.Mixed })
  sessionState?: any; // 保存完整会话状态（用于恢复）

  @Prop({
    enum: ['pending', 'generating', 'completed', 'failed'],
    default: 'pending',
  })
  reportStatus: string; // 评估报告生成状态

  @Prop()
  reportGeneratedAt?: Date; // 报告生成完成时间

  @Prop()
  reportError?: string; // 报告生成失败原因

  @Prop({ default: false })
  isArchived: boolean; // 是否归档

  @Prop()
  archivedAt?: Date; // 归档时间

  @Prop({ default: false })
  isShared: boolean; // 是否分享

  @Prop()
  sharedAt?: Date; // 分享时间

  @Prop()
  shareUrl?: string; // 分享链接

  // ============ 关联记录 ============
  @Prop({ index: true })
  consumptionRecordId?: string; // 关联的消费记录ID

  // ============ 元数据 ============
  @Prop({ type: MongooseSchema.Types.Mixed })
  metadata?: Record<string, any>;

  @Prop()
  aiModel?: string; // AI模型

  @Prop()
  promptVersion?: string; // Prompt版本
}

export const AIInterviewResultSchema =
  SchemaFactory.createForClass(AIInterviewResult);

// 创建索引
AIInterviewResultSchema.index({ userId: 1, interviewType: 1, createdAt: -1 });
AIInterviewResultSchema.index({ userId: 1, overallScore: -1 });
AIInterviewResultSchema.index({ userId: 1, status: 1, updatedAt: -1 }); // 用于查询未完成面试
