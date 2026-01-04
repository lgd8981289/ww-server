// src/interview/services/interview.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SessionManager } from '../../ai/services/session.manager';
import { ResumeAnalysisService } from './resume-analysis.service';
import { ConversationContinuationService } from './conversation-continuation.service';
import { RESUME_ANALYSIS_SYSTEM_MESSAGE } from '../prompts/resume-analysis.prompts';
import { Subject } from 'rxjs';
import { ResumeQuizDto } from '../dto/resume-quiz.dto';
import { v4 as uuidv4 } from 'uuid';
import { ConsumptionStatus } from '../schemas/consumption-record.schema';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { User, UserDocument } from '../../user/schemas/user.schema';
import { Model, Types } from 'mongoose';
import {
  ConsumptionRecord,
  ConsumptionRecordDocument,
} from '../schemas/consumption-record.schema';
import {
  ResumeQuizResult,
  ResumeQuizResultDocument,
} from '../schemas/interview-quiz-result.schema';
import { DocumentParserService } from './document-parser.service';
import { InterviewAIService } from './interview-ai.service';

/**
 * 进度事件
 */
export interface ProgressEvent {
  type: 'progress' | 'complete' | 'error' | 'timeout';
  step?: number;
  label?: string;
  progress: number; // 0-100
  message?: string;
  data?: any;
  error?: string;
  stage?: 'prepare' | 'generating' | 'saving' | 'done'; // 当前阶段
}

/**
 * 消费类型枚举
 */
export enum ConsumptionType {
  RESUME_QUIZ = 'resume_quiz', // 简历押题
  SPECIAL_INTERVIEW = 'special_interview', // 专项面试
  BEHAVIOR_INTERVIEW = 'behavior_interview', // 行测+HR面试
  AI_INTERVIEW = 'ai_interview', // AI模拟面试（如果使用次数计费）
}

/**
 * 面试服务
 *
 * 这个服务只关心业务逻辑和流程编排：
 * 1. 创建会话
 * 2. 调用具体的分析服务（简历分析、对话继续等）
 * 3. 管理会话历史
 *
 * 不关心具体的 AI 实现细节，那些交给专门的分析服务。
 */
@Injectable()
export class InterviewService {
  private readonly logger = new Logger(InterviewService.name);

  constructor(
    private configService: ConfigService,
    private sessionManager: SessionManager,
    private resumeAnalysisService: ResumeAnalysisService,
    private conversationContinuationService: ConversationContinuationService,
    private documentParserService: DocumentParserService,
    private aiService: InterviewAIService,
    @InjectModel(ConsumptionRecord.name)
    private consumptionRecordModel: Model<ConsumptionRecordDocument>,
    @InjectModel(ResumeQuizResult.name)
    private resumeQuizResultModel: Model<ResumeQuizResultDocument>,
    @InjectModel(User.name)
    private userModel: Model<UserDocument>,
  ) {}

  /**
   * 分析简历（首轮，创建会话）
   *
   * @param userId 用户 ID
   * @param position 职位名称
   * @param resumeContent 简历内容
   * @param jobDescription 岗位要求
   * @returns 分析结果和 sessionId
   */
  async analyzeResume(
    userId: string,
    position: string,
    resumeContent: string,
    jobDescription: string,
  ) {
    try {
      // 第一步：创建新会话
      const systemMessage = RESUME_ANALYSIS_SYSTEM_MESSAGE(position);
      const sessionId = this.sessionManager.createSession(
        userId,
        position,
        systemMessage,
      );

      this.logger.log(`创建会话: ${sessionId}`);

      // 第二步：调用专门的简历分析服务
      const result = await this.resumeAnalysisService.analyze(
        resumeContent,
        jobDescription,
      );

      // 第三步：保存用户输入到会话历史
      this.sessionManager.addMessage(
        sessionId,
        'user',
        `简历内容：${resumeContent}`,
      );

      // 第四步：保存 AI 的回答到会话历史
      this.sessionManager.addMessage(
        sessionId,
        'assistant',
        JSON.stringify(result),
      );

      this.logger.log(`简历分析完成，sessionId: ${sessionId}`);

      return {
        sessionId,
        analysis: result,
      };
    } catch (error) {
      this.logger.error(`分析简历失败: ${error}`);
      throw error;
    }
  }

  /**
   * 继续对话（多轮，基于现有会话）
   *
   * @param sessionId 会话 ID
   * @param userQuestion 用户问题
   * @returns AI 的回答
   */
  async continueConversation(
    sessionId: string,
    userQuestion: string,
  ): Promise<string> {
    try {
      // 第一步：添加用户问题到会话历史
      this.sessionManager.addMessage(sessionId, 'user', userQuestion);

      // 第二步：获取对话历史
      const history = this.sessionManager.getRecentMessages(sessionId, 10);

      this.logger.log(
        `继续对话，sessionId: ${sessionId}，历史消息数: ${history.length}`,
      );

      // 第三步：调用专门的对话继续服务
      const aiResponse =
        await this.conversationContinuationService.continue(history);

      // 第四步：保存 AI 的回答到会话历史
      this.sessionManager.addMessage(sessionId, 'assistant', aiResponse);

      this.logger.log(`对话继续完成，sessionId: ${sessionId}`);

      return aiResponse;
    } catch (error) {
      this.logger.error(`继续对话失败: ${error}`);
      throw error;
    }
  }

  /**
   * 生成简历押题（带流式进度）
   * @param userId 用户ID
   * @param dto 请求参数
   * @returns Subject 流式事件
   */
  generateResumeQuizWithProgress(
    userId: string,
    dto: ResumeQuizDto,
  ): Subject<ProgressEvent> {
    const subject = new Subject<ProgressEvent>();

    // 异步执行，通过 Subject 发送进度
    this.executeResumeQuiz(userId, dto, subject).catch((error) => {
      subject.error(error);
    });

    return subject;
  }

  /**
   * 执行简历押题（核心业务逻辑）
   */
  private async executeResumeQuiz(
    userId: string,
    dto: ResumeQuizDto,
    progressSubject?: Subject<ProgressEvent>,
  ): Promise<any> {
    let consumptionRecord: any = null;
    const recordId = uuidv4();
    const resultId = uuidv4();
    console.log('recordId', recordId);

    // 处理错误
    try {
      // ========== 步骤 0: 幂等性检查 ==========
      // ⚠️ 这是最关键的一步：防止重复生成
      if (dto.requestId) {
        // 在数据库中查询是否存在这个 requestId 的记录
        const existingRecord = await this.consumptionRecordModel.findOne({
          userId,
          'metadata.requestId': dto.requestId,
          status: {
            $in: [ConsumptionStatus.SUCCESS, ConsumptionStatus.PENDING],
          },
        });

        if (existingRecord) {
          // 找到了相同 requestId 的记录！

          if (existingRecord.status === ConsumptionStatus.SUCCESS) {
            // 之前已经成功生成过，直接返回已有的结果
            this.logger.log(
              `重复请求，返回已有结果: requestId=${dto.requestId}`,
            );

            // 查询之前生成的结果
            const existingResult = await this.resumeQuizResultModel.findOne({
              resultId: existingRecord.resultId,
            });

            if (!existingResult) {
              throw new BadRequestException('结果不存在');
            }

            // ✅ 直接返回，不再执行后续步骤，不再扣费
            return {
              resultId: existingResult.resultId,
              questions: existingResult.questions,
              summary: existingResult.summary,
              remainingCount: await this.getRemainingCount(userId, 'resume'),
              consumptionRecordId: existingRecord.recordId,
              // ⭐ 重要：标记这是从缓存返回的结果
              isFromCache: true,
            };
          }

          if (existingRecord.status === ConsumptionStatus.PENDING) {
            // 同一个请求还在处理中，告诉用户稍后查询
            throw new BadRequestException('请求正在处理中，请稍后查询结果');
          }
        }
      }

      // ========== 步骤 1: 检查并扣除次数（原子操作）==========
      // ⚠️ 注意：扣费后如果后续步骤失败，会在 catch 块中自动退款

      const user = await this.userModel.findOneAndUpdate(
        {
          _id: userId,
          resumeRemainingCount: { $gt: 0 }, // 条件：必须余额 > 0
        },
        {
          $inc: { resumeRemainingCount: -1 }, // 原子操作：余额 - 1
        },
        { new: false }, // 返回更新前的文档，用于日志记录
      );

      // 检查扣费是否成功
      if (!user) {
        throw new BadRequestException('简历押题次数不足，请前往充值页面购买');
      }

      // 记录详细日志
      this.logger.log(
        `✅ 用户扣费成功: userId=${userId}, 扣费前=${user.resumeRemainingCount}, 扣费后=${user.resumeRemainingCount - 1}`,
      );

      // ========== 步骤 2: 创建消费记录（pending）==========

      consumptionRecord = await this.consumptionRecordModel.create({
        recordId, // 消费记录唯一ID
        user: new Types.ObjectId(userId),
        userId,
        type: ConsumptionType.RESUME_QUIZ, // 消费类型
        status: ConsumptionStatus.PENDING, // ⭐ 关键：标记为处理中
        consumedCount: 1, // 消费次数
        description: `简历押题 - ${dto?.company} ${dto.positionName}`,

        // 记录输入参数（用于调试和重现问题）
        inputData: {
          company: dto?.company || '',
          positionName: dto.positionName,
          minSalary: dto.minSalary,
          maxSalary: dto.maxSalary,
          jd: dto.jd,
          resumeId: dto.resumeId,
        },

        resultId, // 结果ID（稍后会生成）

        // 元数据（包含幂等性检查的 requestId）
        metadata: {
          requestId: dto.requestId, // ← 用于幂等性检查
          promptVersion: dto.promptVersion,
        },

        startedAt: new Date(), // 记录开始时间
      });

      this.logger.log(`✅ 消费记录创建成功: recordId=${recordId}`);

      // ========== 阶段 1: 准备阶段==========
      this.emitProgress(
        progressSubject,
        0,
        '📄 正在读取简历文档...',
        'prepare',
      );
      this.logger.log(`📝 开始提取简历内容: resumeId=${dto.resumeId}`);
      const resumeContent = await this.extractResumeContent(userId, dto);
      this.logger.log(`✅ 简历内容提取成功: ${resumeContent}`);
      this.logger.log(`✅ 简历内容提取成功: 长度=${resumeContent.length}字符`);

      this.emitProgress(progressSubject, 5, '✅ 简历解析完成', 'prepare');

      this.emitProgress(
        progressSubject,
        10,
        '🚀 准备就绪，即将开始 AI 生成...',
      );
      // ========== 阶段 2: AI 生成阶段 - 分两步（10-90%）==========
      const aiStartTime = Date.now();

      this.logger.log(`🤖 开始生成押题部分...`);
      this.emitProgress(
        progressSubject,
        15,
        '🤖 AI 正在理解您的简历内容并生成面试问题...',
      );

      this.getStagePrompt(progressSubject);

      // ===== 第一步：生成押题部分（问题 + 综合评估）10-50% =====
      const questionsResult =
        await this.aiService.generateResumeQuizQuestionsOnly({
          company: dto?.company || '',
          positionName: dto.positionName,
          minSalary: dto.minSalary,
          maxSalary: dto.maxSalary,
          jd: dto.jd,
          resumeContent,
        });

      this.logger.log(
        `✅ 押题部分生成完成: 问题数=${questionsResult.questions?.length || 0}`,
      );

      this.emitProgress(
        progressSubject,
        50,
        '✅ 面试问题生成完成，开始分析匹配度...',
      );
      // ===== 第二步：生成匹配度分析部分，后续不在需要记录进度 =====
      this.logger.log(`🤖 开始生成匹配度分析...`);
      this.emitProgress(
        progressSubject,
        60,
        '🤖 AI 正在分析您与岗位的匹配度...',
      );

      const analysisResult =
        await this.aiService.generateResumeQuizAnalysisOnly({
          company: dto?.company || '',
          positionName: dto.positionName,
          minSalary: dto.minSalary,
          maxSalary: dto.maxSalary,
          jd: dto.jd,
          resumeContent,
        });

      this.logger.log(`✅ 匹配度分析完成`);

      const aiDuration = Date.now() - aiStartTime;
      this.logger.log(
        `⏱️ AI 总耗时: ${aiDuration}ms (${(aiDuration / 1000).toFixed(1)}秒)`,
      );
      // 合并两部分结果
      const aiResult = {
        ...questionsResult,
        ...analysisResult,
      };

      // ========== 阶段 3: 保存结果阶段==========
      const quizResult = await this.resumeQuizResultModel.create({
        resultId,
        user: new Types.ObjectId(userId),
        userId,
        resumeId: dto.resumeId,
        company: dto?.company || '',
        position: dto.positionName,
        jobDescription: dto.jd,
        questions: aiResult.questions,
        totalQuestions: aiResult.questions.length,
        summary: aiResult.summary,
        // AI生成的分析报告数据
        matchScore: aiResult.matchScore,
        matchLevel: aiResult.matchLevel,
        matchedSkills: aiResult.matchedSkills,
        missingSkills: aiResult.missingSkills,
        knowledgeGaps: aiResult.knowledgeGaps,
        learningPriorities: aiResult.learningPriorities,
        radarData: aiResult.radarData,
        strengths: aiResult.strengths,
        weaknesses: aiResult.weaknesses,
        interviewTips: aiResult.interviewTips,
        // 元数据
        consumptionRecordId: recordId,
        aiModel: 'deepseek-chat',
        promptVersion: dto.promptVersion || 'v2',
      });

      this.logger.log(`✅ 结果保存成功: resultId=${resultId}`);

      // 更新消费记录为成功
      await this.consumptionRecordModel.findByIdAndUpdate(
        consumptionRecord._id,
        {
          $set: {
            status: ConsumptionStatus.SUCCESS,
            outputData: {
              resultId,
              questionCount: aiResult.questions.length,
            },
            aiModel: 'deepseek-chat',
            promptTokens: aiResult.usage?.promptTokens,
            completionTokens: aiResult.usage?.completionTokens,
            totalTokens: aiResult.usage?.totalTokens,
            completedAt: new Date(),
          },
        },
      );

      this.logger.log(
        `✅ 消费记录已更新为成功状态: recordId=${consumptionRecord.recordId}`,
      );
      // ========== 阶段 4: 返回结果==========
      const result = {
        resultId: `result-${Date.now()}`, // 临时ID，后面会存到数据库
        questions: questionsResult.questions,
        summary: questionsResult.summary,
        // 匹配度分析数据
        matchScore: analysisResult.matchScore,
        matchLevel: analysisResult.matchLevel,
        matchedSkills: analysisResult.matchedSkills,
        missingSkills: analysisResult.missingSkills,
        knowledgeGaps: analysisResult.knowledgeGaps,
        learningPriorities: analysisResult.learningPriorities,
        radarData: analysisResult.radarData,
        strengths: analysisResult.strengths,
        weaknesses: analysisResult.weaknesses,
        interviewTips: analysisResult.interviewTips,
      };

      // 发送完成事件
      this.emitProgress(
        progressSubject,
        100,
        `✅ 所有分析完成，正在保存结果...响应数据为${JSON.stringify(result)}`,
      );
      return result;
    } catch (error) {
      this.logger.error(
        `❌ 简历押题生成失败: userId=${userId}, error=${error.message}`,
        error.stack,
      );

      // ========== 失败回滚流程 ==========
      try {
        // 1. 返还次数（最重要！）
        this.logger.log(`🔄 开始退还次数: userId=${userId}`);
        await this.refundCount(userId, 'resume');
        this.logger.log(`✅ 次数退还成功: userId=${userId}`);

        // 2. 更新消费记录为失败
        if (consumptionRecord) {
          await this.consumptionRecordModel.findByIdAndUpdate(
            consumptionRecord._id,
            {
              $set: {
                status: ConsumptionStatus.FAILED, // 标记为失败
                errorMessage: error.message, // 记录错误信息
                errorStack:
                  process.env.NODE_ENV === 'development'
                    ? error.stack // 开发环境记录堆栈
                    : undefined, // 生产环境不记录（隐私考虑）
                failedAt: new Date(),
                isRefunded: true, // ← 标记为已退款
                refundedAt: new Date(),
              },
            },
          );
          this.logger.log(
            `✅ 消费记录已更新为失败状态: recordId=${consumptionRecord.recordId}`,
          );
        }
      } catch (refundError) {
        // ⚠️ 退款失败是严重问题，需要人工介入！
        this.logger.error(
          `🚨 退款流程失败！这是严重问题，需要人工介入！` +
            `userId=${userId}, ` +
            `originalError=${error.message}, ` +
            `refundError=${refundError.message}`,
          refundError.stack,
        );

        // TODO: 这里应该发送告警通知（钉钉、邮件等）
        // await this.alertService.sendCriticalAlert({
        //   type: 'REFUND_FAILED',
        //   userId,
        //   error: refundError.message,
        // });
      }

      // 3. 发送错误事件给前端
      if (progressSubject && !progressSubject.closed) {
        progressSubject.next({
          type: 'error',
          progress: 0,
          label: '❌ 生成失败',
          error: error,
        });
        progressSubject.complete();
      }

      throw error;
    }
  }

  /**
   * 退还次数
   * ⚠️ 关键方法：确保在任何失败情况下都能正确退还用户次数
   */
  private async refundCount(
    userId: string,
    type: 'resume' | 'special' | 'behavior',
  ): Promise<void> {
    const field =
      type === 'resume'
        ? 'resumeRemainingCount'
        : type === 'special'
          ? 'specialRemainingCount'
          : 'behaviorRemainingCount';

    // 使用原子操作退还次数
    const result = await this.userModel.findByIdAndUpdate(
      userId,
      {
        $inc: { [field]: 1 },
      },
      { new: true }, // 返回更新后的文档
    );

    // 验证退款是否成功
    if (!result) {
      throw new Error(`退款失败：用户不存在 userId=${userId}`);
    }

    this.logger.log(
      `✅ 次数退还成功: userId=${userId}, type=${type}, 退还后=${result[field]}`,
    );
  }

  /**
   * 发送进度事件
   * @param subject 进度 Subject
   * @param progress 进度百分比 (0-100)
   * @param label 进度提示文本
   * @param stage 当前阶段
   */
  private emitProgress(
    subject: Subject<ProgressEvent> | undefined,
    progress: number,
    label: string,
    stage?: 'prepare' | 'generating' | 'saving' | 'done',
  ): void {
    if (subject && !subject.closed) {
      subject.next({
        type: 'progress',
        progress: Math.min(Math.max(progress, 0), 100), // 确保在 0-100 范围内
        label,
        message: label,
        stage,
      });
    }
  }

  /**
   * 获取剩余次数
   * resume： 简历押题
   * special：专项面试
   * behavior：HR + 行测面试
   */
  private async getRemainingCount(
    userId: string,
    type: 'resume' | 'special' | 'behavior',
  ): Promise<number> {
    const user = await this.userModel.findById(userId);
    if (!user) return 0;

    switch (type) {
      case 'resume':
        return user.resumeRemainingCount;
      case 'special':
        return user.specialRemainingCount;
      case 'behavior':
        return user.behaviorRemainingCount;
      default:
        return 0;
    }
  }

  /**
   * 不同阶段的提示信息
   */
  private getStagePrompt(
    progressSubject: Subject<ProgressEvent> | undefined,
  ): void {
    if (!progressSubject) return;
    // 定义不同阶段的提示信息
    const progressMessages = [
      // 0-20%: 理解阶段
      { progress: 0.05, message: '🤖 AI 正在深度理解您的简历内容...' },
      { progress: 0.1, message: '📊 AI 正在分析您的技术栈和项目经验...' },
      { progress: 0.15, message: '🔍 AI 正在识别您的核心竞争力...' },
      { progress: 0.2, message: '📋 AI 正在对比岗位要求与您的背景...' },

      // 20-50%: 设计问题阶段
      { progress: 0.25, message: '💡 AI 正在设计针对性的技术问题...' },
      { progress: 0.3, message: '🎯 AI 正在挖掘您简历中的项目亮点...' },
      { progress: 0.35, message: '🧠 AI 正在构思场景化的面试问题...' },
      { progress: 0.4, message: '⚡ AI 正在设计不同难度的问题组合...' },
      { progress: 0.45, message: '🔬 AI 正在分析您的技术深度和广度...' },
      { progress: 0.5, message: '📝 AI 正在生成基于 STAR 法则的答案...' },

      // 50-70%: 优化阶段
      { progress: 0.55, message: '✨ AI 正在优化问题的表达方式...' },
      { progress: 0.6, message: '🎨 AI 正在为您准备回答要点和技巧...' },
      { progress: 0.65, message: '💎 AI 正在提炼您的项目成果和亮点...' },
      { progress: 0.7, message: '🔧 AI 正在调整问题难度分布...' },

      // 70-85%: 完善阶段
      { progress: 0.75, message: '📚 AI 正在补充技术关键词和考察点...' },
      { progress: 0.8, message: '🎓 AI 正在完善综合评估建议...' },
      { progress: 0.85, message: '🚀 AI 正在做最后的质量检查...' },
      { progress: 0.9, message: '✅ AI 即将完成问题生成...' },
    ];

    // 模拟一个定时器：每间隔一秒，响应一次数据
    let progress = 0;
    let currentMessage = progressMessages[0];
    const interval = setInterval(
      () => {
        progress += 1;
        currentMessage = progressMessages[progress];
        // 发送进度事件
        this.emitProgress(
          progressSubject,
          progress,
          currentMessage.message,
          'generating',
        );
        // 简单处理，到了 progressMessages 的 length 就结束了
        if (progress === progressMessages.length - 1) {
          clearInterval(interval);
          this.emitProgress(progressSubject, 100, 'AI 已完成问题生成', 'done');
          return {
            questions: [],
            analysis: [],
          };
        }
      },
      Math.floor(Math.random() * (2000 - 800 + 1)) + 800, // 每 0.8-2 秒更新一次
    );
  }

  /**
   * 提取简历内容
   * 支持三种方式：直接文本、结构化简历、上传文件
   */
  private async extractResumeContent(
    userId: string,
    dto: ResumeQuizDto,
  ): Promise<string> {
    // 优先级 1：如果直接提供了简历文本，使用它
    if (dto.resumeContent) {
      this.logger.log(
        `✅ 使用直接提供的简历文本，长度=${dto.resumeContent.length}字符`,
      );
      return dto.resumeContent;
    }

    // 优先级 2：如果提供了 resumeId，尝试查询
    // 之前 ResumeQuizDto 中没有创建 resumeURL 的属性，所以这里需要在 ResumeQuizDto 中补充以下 resumeURL
    if (dto.resumeURL) {
      try {
        // 1. 从 URL 下载文件
        const rawText = await this.documentParserService.parseDocumentFromUrl(
          dto.resumeURL,
        );

        // 2. 清理文本（移除格式化符号等）
        const cleanedText = this.documentParserService.cleanText(rawText);

        // 3. 验证内容质量
        const validation =
          this.documentParserService.validateResumeContent(cleanedText);

        if (!validation.isValid) {
          throw new BadRequestException(validation.reason);
        }

        // 4. 记录任何警告
        if (validation.warnings && validation.warnings.length > 0) {
          this.logger.warn(`简历解析警告: ${validation.warnings.join('; ')}`);
        }

        // 5. 检查内容长度（避免超长内容）
        const estimatedTokens =
          this.documentParserService.estimateTokens(cleanedText);

        if (estimatedTokens > 6000) {
          this.logger.warn(
            `简历内容过长: ${estimatedTokens} tokens，将进行截断`,
          );
          // 截取前 6000 tokens 对应的字符
          const maxChars = 6000 * 1.5; // 约 9000 字符
          const truncatedText = cleanedText.substring(0, maxChars);

          this.logger.log(
            `简历已截断: 原长度=${cleanedText.length}, ` +
              `截断后=${truncatedText.length}, ` +
              `tokens≈${this.documentParserService.estimateTokens(truncatedText)}`,
          );

          return truncatedText;
        }

        this.logger.log(
          `✅ 简历解析成功: 长度=${cleanedText.length}字符, ` +
            `tokens≈${estimatedTokens}`,
        );

        return cleanedText;
      } catch (error) {
        // 文件解析失败，返回友好的错误信息
        if (error instanceof BadRequestException) {
          throw error;
        }

        this.logger.error(
          `❌ 解析简历文件失败: resumeId=${dto.resumeId}, error=${error.message}`,
          error.stack,
        );

        throw new BadRequestException(
          `简历文件解析失败: ${error.message}。` +
            `建议：确保上传的是文本型 PDF 或 DOCX 文件，未加密且未损坏。` +
            `或者直接粘贴简历文本。`,
        );
      }
    }

    // 都没提供，返回错误
    throw new BadRequestException('请提供简历URL或简历内容');
  }
}
