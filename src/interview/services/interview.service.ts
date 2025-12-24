import { PromptTemplate } from '@langchain/core/prompts';
import { JsonOutputParser } from '@langchain/core/output_parsers';
import { ChatDeepSeek } from '@langchain/deepseek';
import { ConfigService } from '@nestjs/config';
import { Injectable, Logger } from '@nestjs/common';
import { Model, Types } from 'mongoose';
import {
  RESUME_QUIZ_PROMPT,
  RESUME_QUIZ_PROMPT2,
} from '../prompts/resume-quiz.prompts';
import {
  StartMockInterviewDto,
  MockInterviewEventType,
  MockInterviewType,
} from '../dto/mock-interview.dto';
import { Subject } from 'rxjs';
import { v4 as uuid } from 'uuid';
import { InterviewAIService } from './interview-ai.service';
import { InjectModel } from '@nestjs/mongoose';
import {
  AIInterviewResult,
  AIInterviewResultDocument,
} from '../schemas/ai-interview-result.schema';

/**
 * 模拟面试事件
 * 描述一次模拟面试过程中的各种事件信息，包括面试的状态、提问进度、错误信息等。
 */
export interface MockInterviewEvent {
  type: MockInterviewEventType; // 事件类型，参考 MockInterviewEventType 枚举，表示当前事件的种类（如提问、错误等）
  sessionId?: string; // 面试会话的唯一标识符（可选），与 InterviewSession 中的 sessionId 对应
  interviewerName?: string; // 面试官的姓名（可选）
  content?: string; // 事件的内容，可能是问题的内容或其他描述信息（可选）
  questionNumber?: number; // 当前提问的题号（可选）
  totalQuestions?: number; // 面试的总问题数量（可选）
  elapsedMinutes?: number; // 已经过的面试时间（单位：分钟， 可选）
  error?: string; // 错误信息（可选），如果发生错误则返回错误描述
  resultId?: string; // 结果ID（可选），与面试结果相关联，通常用于保存或查询结果
  isStreaming?: boolean; // 是否正在进行流式传输（可选），如果正在传输面试内容时为 true
  metadata?: Record<string, any>; // 额外的元数据（可选），可以用于存储其他额外信息
}

/**
 * 面试会话状态
 * 描述一次面试会话的各项信息，包括候选人、面试官、职位信息、会话历史记录等。
 */
interface InterviewSession {
  sessionId: string; // 面试会话的唯一标识符
  userId: string; // 用户的唯一标识符，通常是候选人的ID
  interviewType: MockInterviewType; // 面试类型，参考 MockInterviewType 枚举
  interviewerName: string; // 面试官的姓名
  candidateName?: string; // 候选人的姓名（可选）
  company?: string; // 面试公司名称（可选）
  positionName?: string; // 面试的职位名称（可选）
  salaryRange?: string; // 该职位的薪资范围（可选）
  jd?: string; // 职位的招聘描述（可选）
  resumeContent: string; // 候选人的简历内容
  conversationHistory: Array<{
    role: 'interviewer' | 'candidate'; // 发言者角色，区分面试官或候选人
    content: string; // 发言内容
    timestamp: Date; // 发言的时间戳
    standardAnswer?: string; // 面试官问题的标准答案（仅面试官提问时有）
  }>;
  questionCount: number; // 面试中问题的数量
  startTime: Date; // 面试开始的时间
  targetDuration: number; // 目标时长，单位为分钟，面试预计持续的时间
  isActive: boolean; // 是否为当前进行中的面试会话
  // 实时保存相关
  resultId?: string; // 结果ID，首次保存面试结果时生成
  consumptionRecordId?: string; // 消费记录ID，记录用户消费信息
}

@Injectable()
export class InterviewService {
  private configService: ConfigService;
  // 日志打印的类
  private readonly logger = new Logger(InterviewService.name);
  // 大模型
  private model: ChatDeepSeek;
  // 存储活跃的面试会话（内存中）
  private interviewSessions: Map<string, InterviewSession> = new Map();

  constructor(
    configService: ConfigService,
    private aiService: InterviewAIService,
    @InjectModel(AIInterviewResult.name)
    private aiInterviewResultModel: Model<AIInterviewResultDocument>,
  ) {
    this.configService = configService;
    const apiKey = this.configService.get<string>('DEEPSEEK_API_KEY');
    if (!apiKey) {
      this.logger.warn(
        'DEEPSEEK_API_KEY not configured, AI service will not work',
      );
    }
    // deepseek-reasoner ：思考模式（慢，适合需要深度推理的任务，如数学、逻辑题）
    // deepseek-chat	： 非思考模式（快，适合内容生成任务，如面试问题、文案创作）
    // ⚠️ 对于生成面试问题，使用 deepseek-chat 更快（10-30秒），reasoner 会超时（5-10分钟）
    this.model = new ChatDeepSeek({
      apiKey: apiKey || 'dummy-key',
      model:
        this.configService.get<string>('DEEPSEEK_MODEL') || 'deepseek-chat',
      temperature: 0.7,
      maxTokens: Number(this.configService.get<string>('MAX_TOKENS')) || 4000,
    });
  }

  async analyzeResume(resumeContent: string, jobDescription: string) {
    // 创建 Prompt 模板
    const prompt = PromptTemplate.fromTemplate(RESUME_QUIZ_PROMPT2);

    // 创建输出解析器
    const parser = new JsonOutputParser();

    // 创建链
    const chain = prompt.pipe(this.model).pipe(parser);

    // 调用链
    try {
      const result = await chain.invoke({
        resume_content: resumeContent,
        job_description: jobDescription,
      });

      return result;
    } catch (error) {
      console.error('简历分析失败:', error);
      throw error;
    }
  }

  /**
   * 生成简历押题
   */
  async generateResumeQuiz(input: {
    position: string;
    years: number;
    skills: string;
    recent_projects: string;
    job_description: string;
    education: string;
    question_count?: number;
  }) {
    try {
      const questionCount = input.question_count || 10;

      // 创建 Prompt 模板
      const prompt = PromptTemplate.fromTemplate(RESUME_QUIZ_PROMPT);

      // 创建输出解析器
      const parser = new JsonOutputParser();

      // 创建链
      const chain = prompt.pipe(this.model).pipe(parser);

      // 调用链
      this.logger.debug(
        `准备为 ${input.position} 生成 ${questionCount} 道押题`,
      );

      const result = await chain.invoke({
        position: input.position,
        years: input.years,
        skills: input.skills,
        recent_projects: input.recent_projects,
        job_description: input.job_description,
        education: input.education,
        question_count: questionCount,
      });

      return result;
    } catch (error) {
      this.logger.error('无法生成简历押题数据', error);
      throw new Error('无法生成简历押题数据: ' + error.message);
    }
  }

  /**
   * 开始模拟面试（流式响应）
   * @param userId 用户ID
   * @param dto 请求参数
   * @returns Subject 流式事件
   */
  startMockInterviewWithStream(
    userId: string,
    dto: StartMockInterviewDto,
  ): Subject<MockInterviewEvent> {
    const subject = new Subject<MockInterviewEvent>();

    // 异步执行
    this.executeStartMockInterview(userId, dto, subject).catch((error) => {
      this.logger.error(`模拟面试启动失败: ${error.message}`, error.stack);
      if (subject && !subject.closed) {
        subject.next({
          type: MockInterviewEventType.ERROR,
          error: error,
        });
        subject.complete();
      }
    });

    return subject;
  }

  /**
   * 执行开始模拟面试
   */
  private async executeStartMockInterview(
    userId: string,
    dto: StartMockInterviewDto,
    progressSubject: Subject<MockInterviewEvent>,
  ): Promise<void> {
    try {
      // 创建会话的 ID。这里通过 uuid 这个库创建即可
      const sessionId = uuid();
      // 面试官的名字
      const interviewerName = 'AI面试官';
      // 构建薪资范围
      const salaryRange = `${dto.minSalary}K-${dto.maxSalary}K`;

      const session: InterviewSession = {
        sessionId,
        userId,
        interviewType: dto.interviewType,
        interviewerName,
        candidateName: dto.candidateName,
        company: dto.company || '',
        positionName: dto.positionName,
        salaryRange,
        jd: dto.jd,
        resumeContent: dto.resumeContent,
        conversationHistory: [],
        questionCount: 0,
        startTime: new Date(),
        targetDuration:
          dto.interviewType === MockInterviewType.SPECIAL ? 90 : 60, // 专项面试 90 分钟，HR 面试 60 分钟
        isActive: true,
      };

      this.interviewSessions.set(sessionId, session);

      // 4. 创建数据库记录并生成 resultId（当前面试的结果ID）
      // TODO：对接消费之后，这里还需要生成 消费ID recordId
      const resultId = uuid();

      session.resultId = resultId;

      await this.aiInterviewResultModel.create({
        resultId,
        user: new Types.ObjectId(userId),
        userId,
        interviewType:
          dto.interviewType === MockInterviewType.SPECIAL
            ? 'special'
            : 'behavior',
        company: dto.company || '',
        position: dto.positionName,
        salaryRange,
        jobDescription: dto.jd,
        interviewMode: 'text',
        qaList: [],
        totalQuestions: 0,
        answeredQuestions: 0,
        status: 'in_progress',
        consumptionRecordId: 'recordId', // TODO：暂时先用字符串代替。对接消费之后，这里还需要生成 消费ID recordId
        sessionState: session, // 保存会话状态
        metadata: {
          interviewerName,
          candidateName: dto.candidateName,
          sessionId,
        },
      });

      this.logger.log(
        `✅ 面试会话创建成功: sessionId=${sessionId}, resultId=${resultId}, interviewer=${interviewerName}`,
      );

      // 5. 流式生成开场白
      let fullOpeningStatement = '';
      const openingGenerator = this.aiService.generateOpeningStatementStream(
        interviewerName,
        dto.candidateName,
        dto.positionName,
      );

      // 逐块推送开场白
      for await (const chunk of openingGenerator) {
        fullOpeningStatement += chunk;

        // 发送流式事件
        progressSubject.next({
          type: MockInterviewEventType.START,
          sessionId,
          resultId, // ✅ 包含 resultId
          interviewerName,
          content: fullOpeningStatement, // 累积内容
          questionNumber: 0,
          totalQuestions:
            dto.interviewType === MockInterviewType.SPECIAL ? 12 : 8,
          elapsedMinutes: 0,
          isStreaming: true, // 标记为流式传输中
        });
      }

      // 记录开场白生成时间
      const openingStatementTime = new Date();

      // 记录到对话历史
      session.conversationHistory.push({
        role: 'interviewer',
        content: fullOpeningStatement,
        timestamp: openingStatementTime,
      });

      // 6. 保存开场白到数据库 qaList
      await this.aiInterviewResultModel.findOneAndUpdate(
        { resultId },
        {
          $push: {
            qaList: {
              question: fullOpeningStatement,
              answer: '', // 开场白没有用户回答
              answerDuration: 0,
              answeredAt: openingStatementTime,
              askedAt: openingStatementTime, // ✅ 记录提问时间
            },
          },
          $set: {
            sessionState: session, // 更新会话状态
          },
        },
      );

      this.logger.log(`📝 开场白已保存到数据库: resultId=${resultId}`);

      // 7. 发送最终开场白事件（标记流式完成）
      progressSubject.next({
        type: MockInterviewEventType.START,
        sessionId,
        resultId, // ✅ 包含 resultId
        interviewerName,
        content: fullOpeningStatement,
        questionNumber: 0,
        totalQuestions:
          dto.interviewType === MockInterviewType.SPECIAL ? 12 : 8,
        elapsedMinutes: 0,
        isStreaming: false, // 流式传输完成
      });

      // 8. 发送等待事件
      progressSubject.next({
        type: MockInterviewEventType.WAITING,
        sessionId,
      });

      progressSubject.complete();
    } catch (error) {
      // TODO: 失败时退还次数。目前还不需要做
      const countField =
        dto.interviewType === MockInterviewType.SPECIAL
          ? 'special'
          : 'behavior';
      this.logger.error(
        `${countField} 面试启动失败: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
