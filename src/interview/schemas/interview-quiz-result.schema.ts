import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes, Types } from 'mongoose';

export type ResumeQuizResultDocument = ResumeQuizResult & Document;

/**
 * 面试问题难度
 */
export enum QuestionDifficulty {
  EASY = 'easy',
  MEDIUM = 'medium',
  HARD = 'hard',
}

/**
 * 面试问题类别
 */
export enum QuestionCategory {
  TECHNICAL = 'technical', // 技术能力
  PROJECT = 'project', // 项目经验
  PROBLEM_SOLVING = 'problem-solving', // 问题解决
  SOFT_SKILL = 'soft-skill', // 软技能
  BEHAVIORAL = 'behavioral', // 行为面试
  SCENARIO = 'scenario', // 场景题
}

/**
 * 单个面试问题
 */
@Schema({ _id: false })
export class InterviewQuestion {
  @Prop({ required: true })
  question: string; // 问题内容

  @Prop({ required: true })
  answer: string; // 参考答案

  @Prop({ enum: QuestionCategory, required: true })
  category: QuestionCategory; // 问题类别

  @Prop({ enum: QuestionDifficulty, required: true })
  difficulty: QuestionDifficulty; // 难度

  @Prop()
  tips?: string; // 回答提示

  @Prop({ type: [String], default: [] })
  keywords?: string[]; // 关键词

  @Prop()
  reasoning?: string; // 出题理由（为什么问这个问题）

  @Prop({ default: false })
  isFavorite?: boolean; // 是否收藏

  @Prop({ default: false })
  isPracticed?: boolean; // 是否已练习

  @Prop()
  practicedAt?: Date; // 练习时间

  @Prop()
  userNote?: string; // 用户笔记
}

export const InterviewQuestionSchema =
  SchemaFactory.createForClass(InterviewQuestion);

/**
 * 技能匹配项
 */
@Schema({ _id: false })
export class SkillMatch {
  @Prop({ required: true })
  skill: string; // 技能名称

  @Prop({ required: true })
  matched: boolean; // 是否匹配

  @Prop()
  proficiency?: string; // 熟练度描述
}

export const SkillMatchSchema = SchemaFactory.createForClass(SkillMatch);

/**
 * 学习优先级
 */
@Schema({ _id: false })
export class LearningPriority {
  @Prop({ required: true })
  topic: string; // 主题

  @Prop({ required: true, enum: ['high', 'medium', 'low'] })
  priority: string; // 优先级

  @Prop({ required: true })
  reason: string; // 原因
}

export const LearningPrioritySchema =
  SchemaFactory.createForClass(LearningPriority);

/**
 * 雷达图维度
 */
@Schema({ _id: false })
export class RadarDimension {
  @Prop({ required: true })
  dimension: string; // 维度名称

  @Prop({ required: true, type: Number, min: 0, max: 100 })
  score: number; // 得分

  @Prop()
  description?: string; // 描述
}

export const RadarDimensionSchema =
  SchemaFactory.createForClass(RadarDimension);

/**
 * 简历押题结果 Schema
 */
@Schema({ timestamps: true })
export class ResumeQuizResult {
  @Prop({ required: true, unique: true })
  resultId: string; // 结果唯一ID

  @Prop({
    type: SchemaTypes.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  })
  user: Types.ObjectId; // 关联用户

  @Prop({ required: true, index: true })
  userId: string; // 用户ID

  // ============ 输入信息 ============
  @Prop()
  resumeId?: string; // 关联的简历ID

  @Prop({ required: true })
  company: string; // 公司名称

  @Prop({ required: true })
  position: string; // 岗位名称

  @Prop()
  salaryRange?: string; // 薪资范围（格式化后的，如 "20K-35K"）

  @Prop({ type: String })
  jobDescription?: string; // 职位描述（JD，可能很长）

  @Prop({ type: String })
  resumeSnapshot?: string; // 简历快照（脱敏后的文本）

  // ============ 生成结果 ============
  @Prop({ type: [InterviewQuestionSchema], default: [] })
  questions: InterviewQuestion[]; // 面试问题列表

  @Prop()
  totalQuestions?: number; // 问题总数

  @Prop()
  summary?: string; // AI生成的总结/建议

  // ============ AI分析报告 ============
  @Prop({ type: Number, min: 0, max: 100 })
  matchScore?: number; // 简历与岗位匹配度（0-100）

  @Prop()
  matchLevel?: string; // 匹配度等级（优秀/良好/中等/较差）

  @Prop({ type: [SkillMatchSchema], default: [] })
  matchedSkills?: SkillMatch[]; // 匹配的技能

  @Prop({ type: [String], default: [] })
  missingSkills?: string[]; // 缺失的技能

  @Prop({ type: [String], default: [] })
  knowledgeGaps?: string[]; // 需要补充的知识点

  @Prop({ type: [LearningPrioritySchema], default: [] })
  learningPriorities?: LearningPriority[]; // 学习优先级建议

  @Prop({ type: [RadarDimensionSchema], default: [] })
  radarData?: RadarDimension[]; // 雷达图维度数据

  @Prop({ type: [String], default: [] })
  strengths?: string[]; // 优势

  @Prop({ type: [String], default: [] })
  weaknesses?: string[]; // 薄弱环节

  @Prop({ type: [String], default: [] })
  interviewTips?: string[]; // 面试准备建议

  @Prop({ type: SchemaTypes.Mixed })
  questionDistribution?: Record<string, number>; // 问题类别分布

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
  @Prop({ default: false })
  isArchived: boolean; // 是否归档

  @Prop()
  archivedAt?: Date; // 归档时间

  @Prop({ default: false })
  isShared: boolean; // 是否分享（未来功能）

  @Prop()
  sharedAt?: Date; // 分享时间

  @Prop()
  shareUrl?: string; // 分享链接

  // ============ 关联记录 ============
  @Prop({ index: true })
  consumptionRecordId?: string; // 关联的消费记录ID

  // ============ 元数据 ============
  @Prop({ type: SchemaTypes.Mixed })
  metadata?: Record<string, any>;

  @Prop()
  aiModel?: string; // 使用的AI模型

  @Prop()
  promptVersion?: string; // Prompt版本（用于A/B测试）
}

export const ResumeQuizResultSchema =
  SchemaFactory.createForClass(ResumeQuizResult);

// 创建索引
ResumeQuizResultSchema.index({ userId: 1, createdAt: -1 });
ResumeQuizResultSchema.index({ userId: 1, company: 1 });
ResumeQuizResultSchema.index({ userId: 1, isArchived: 1 });
