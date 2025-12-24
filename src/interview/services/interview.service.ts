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
import { NotFoundException } from '@nestjs/common';
import { BadRequestException } from '@nestjs/common';

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

  /**
   * 处理候选人回答（流式响应）
   * @param userId 用户ID
   * @param sessionId 会话ID
   * @param answer 候选人回答
   * @returns Subject 流式事件
   */
  answerMockInterviewWithStream(
    userId: string,
    sessionId: string,
    answer: string,
  ): Subject<MockInterviewEvent> {
    const subject = new Subject<MockInterviewEvent>();

    // 异步执行
    this.executeAnswerMockInterview(userId, sessionId, answer, subject).catch(
      (error) => {
        this.logger.error(`处理面试回答失败: ${error.message}`, error.stack);
        if (subject && !subject.closed) {
          subject.next({
            type: MockInterviewEventType.ERROR,
            error: error.message,
          });
          subject.complete();
        }
      },
    );

    return subject;
  }

  /**
   * 执行处理候选人回答
   */
  private async executeAnswerMockInterview(
    userId: string,
    sessionId: string,
    answer: string,
    progressSubject: Subject<MockInterviewEvent>,
  ): Promise<void> {
    try {
      // 1. 获取会话
      const session = this.interviewSessions.get(sessionId);

      if (!session) {
        throw new NotFoundException('面试会话不存在或已过期');
      }

      if (session.userId !== userId) {
        throw new BadRequestException('无权访问此面试会话');
      }

      if (!session.isActive) {
        throw new BadRequestException('面试会话已结束');
      }

      // 2. 记录候选人回答
      session.conversationHistory.push({
        role: 'candidate',
        content: answer,
        timestamp: new Date(),
      });

      session.questionCount++;

      // 3. 计算已用时间
      const elapsedMinutes = Math.floor(
        (Date.now() - session.startTime.getTime()) / 1000 / 60,
      );

      this.logger.log(`当前面试用时：${elapsedMinutes}分钟`);

      this.logger.log(
        `📝 候选人回答: sessionId=${sessionId}, questionCount=${session.questionCount}, elapsed=${elapsedMinutes}min`,
      );

      // 3.1 检查是否超时，需要强制结束面试
      const maxDuration =
        session.interviewType === MockInterviewType.SPECIAL ? 90 : 60;

      // 处理面试结束的逻辑
      if (elapsedMinutes >= maxDuration) {
        this.logger.log(
          `⏰ 面试超时，强制结束: sessionId=${sessionId}, elapsed=${elapsedMinutes}min, max=${maxDuration}min`,
        );

        // 面试结束
        session.isActive = false;

        // 添加结束语
        const closingStatement = `感谢您今天的面试表现。由于时间关系（已进行${elapsedMinutes}分钟），我们今天的面试就到这里。您的回答让我们对您有了较为全面的了解，后续我们会进行综合评估，有结果会及时通知您。祝您生活愉快！`;

        session.conversationHistory.push({
          role: 'interviewer',
          content: closingStatement,
          timestamp: new Date(),
        });

        // 保存面试结果
        const resultId = await this.saveMockInterviewResult(session);

        // 发送结束事件
        progressSubject.next({
          type: MockInterviewEventType.END,
          sessionId,
          content: closingStatement,
          resultId,
          elapsedMinutes,
          isStreaming: false,
          metadata: {
            totalQuestions: session.questionCount,
            interviewerName: session.interviewerName,
            reason: 'timeout', // 标记为超时结束
          },
        });

        // TODO：处理评估报告

        // 清理会话。最好做个延迟处理，以防万一
        setTimeout(
          () => {
            this.interviewSessions.delete(sessionId);
            this.logger.log(`🗑️ 会话已清理: sessionId=${sessionId}`);
          },
          5 * 60 * 1000,
        );

        progressSubject.complete();
        return; // 提前返回，不再继续生成下一个问题
      }

      // 4. 发送思考中事件
      progressSubject.next({
        type: MockInterviewEventType.THINKING,
        sessionId,
      });

      // 5. 流式生成下一个问题
      const questionStartTime = new Date(); // ✅ 记录问题开始生成的时间
      let fullQuestion = '';
      let aiResponse: {
        question: string;
        shouldEnd: boolean;
        standardAnswer?: string;
        reasoning?: string;
      };

      // 生成面试问题流
      const questionGenerator = this.aiService.generateInterviewQuestionStream({
        interviewType:
          session.interviewType === MockInterviewType.SPECIAL
            ? 'special'
            : 'comprehensive',
        resumeContent: session.resumeContent,
        company: session.company || '',
        positionName: session.positionName,
        jd: session.jd,
        conversationHistory: session.conversationHistory.map((h) => ({
          role: h.role,
          content: h.content,
        })),
        elapsedMinutes,
        targetDuration: session.targetDuration,
      });

      // 逐块推送问题内容，并捕获返回值
      let hasStandardAnswer = false; // 标记是否已检测到标准答案
      let questionOnlyContent = ''; // 只包含问题的内容
      let standardAnswerContent = ''; // 标准答案内容

      try {
        let result = await questionGenerator.next();
        while (!result.done) {
          const chunk = result.value;
          fullQuestion += chunk;

          // 检测是否包含标准答案标记
          const standardAnswerIndex = fullQuestion.indexOf('[STANDARD_ANSWER]');

          if (standardAnswerIndex !== -1) {
            // 检测到标准答案标记
            if (!hasStandardAnswer) {
              // 第一次检测到，提取问题部分
              questionOnlyContent = fullQuestion
                .substring(0, standardAnswerIndex)
                .trim();
              hasStandardAnswer = true;

              // 发送最终问题内容（标记流式完成）
              progressSubject.next({
                type: MockInterviewEventType.QUESTION,
                sessionId,
                interviewerName: session.interviewerName,
                content: questionOnlyContent,
                questionNumber: session.questionCount,
                totalQuestions:
                  session.interviewType === MockInterviewType.SPECIAL ? 12 : 8,
                elapsedMinutes,
                isStreaming: false, // ✅ 标记流式传输完成
              });

              // 立即发送等待事件，告诉前端问题已结束
              progressSubject.next({
                type: MockInterviewEventType.WAITING,
                sessionId,
              });

              this.logger.log(
                `✅ 问题生成完成，进入参考答案生成阶段: questionLength=${questionOnlyContent.length}`,
              );
            }

            // 提取并流式推送参考答案
            const currentStandardAnswer = fullQuestion
              .substring(standardAnswerIndex + '[STANDARD_ANSWER]'.length)
              .trim();

            if (currentStandardAnswer.length > standardAnswerContent.length) {
              standardAnswerContent = currentStandardAnswer;

              // 流式推送参考答案
              progressSubject.next({
                type: MockInterviewEventType.REFERENCE_ANSWER,
                sessionId,
                interviewerName: session.interviewerName,
                content: standardAnswerContent,
                questionNumber: session.questionCount,
                totalQuestions:
                  session.interviewType === MockInterviewType.SPECIAL ? 12 : 8,
                elapsedMinutes,
                isStreaming: true, // 标记为流式传输中
              });
            }
          } else {
            // 还在生成问题阶段，继续推送
            progressSubject.next({
              type: MockInterviewEventType.QUESTION,
              sessionId,
              interviewerName: session.interviewerName,
              content: fullQuestion,
              questionNumber: session.questionCount,
              totalQuestions:
                session.interviewType === MockInterviewType.SPECIAL ? 12 : 8,
              elapsedMinutes,
              isStreaming: true, // 标记为流式传输中
            });
          }

          result = await questionGenerator.next();
        }

        // Generator 完成后，发送参考答案的最终状态
        if (hasStandardAnswer && standardAnswerContent) {
          progressSubject.next({
            type: MockInterviewEventType.REFERENCE_ANSWER,
            sessionId,
            interviewerName: session.interviewerName,
            content: standardAnswerContent,
            questionNumber: session.questionCount,
            totalQuestions:
              session.interviewType === MockInterviewType.SPECIAL ? 12 : 8,
            elapsedMinutes,
            isStreaming: false, // ✅ 标记流式传输完成
          });
        }

        // Generator 完成，result.value 现在是返回值
        aiResponse = result.value;

        // 如果没有检测到标准答案标记（可能AI没有生成），使用完整内容
        if (!hasStandardAnswer) {
          questionOnlyContent = fullQuestion;
          this.logger.warn(`⚠️ 未检测到标准答案标记，使用完整内容作为问题`);
        }
      } catch (error) {
        // 如果生成器抛出错误，直接抛出
        throw error;
      }

      // 6. 确保 session.resultId 存在
      if (!session.resultId) {
        this.logger.error(
          `❌ session.resultId 不存在，无法保存数据: sessionId=${sessionId}`,
        );
        throw new Error('session.resultId 不存在，无法保存数据');
      }

      // 7. 【步骤1】保存上一轮的问答（更新用户回答）
      // 在 conversationHistory 中：
      // - length - 1: 刚 push 的用户回答
      // - length - 2: 上一个面试官问题（用户回答的这个问题）
      if (session.conversationHistory.length >= 2) {
        const userAnswerIndex = session.conversationHistory.length - 1;
        const prevQuestionIndex = session.conversationHistory.length - 2;

        const prevQuestion = session.conversationHistory[prevQuestionIndex];
        const userAnswer = session.conversationHistory[userAnswerIndex];

        // 检查是否是开场白（开场白是第一条面试官消息，索引为0）
        const isOpeningStatement = prevQuestionIndex === 0;

        if (
          prevQuestion.role === 'interviewer' &&
          userAnswer.role === 'candidate'
        ) {
          if (isOpeningStatement) {
            // 更新开场白的用户回答
            await this.updateInterviewAnswer(
              session.resultId,
              0, // 开场白是第一项
              userAnswer.content,
              userAnswer.timestamp,
              session, // 传递 session 用于更新 sessionState
            );
          } else {
            // 更新上一个问题的用户回答
            const qaIndex = session.questionCount - 1; // qaList 中的索引
            await this.updateInterviewAnswer(
              session.resultId,
              qaIndex,
              userAnswer.content,
              userAnswer.timestamp,
              session, // 传递 session 用于更新 sessionState
            );
          }
        }
      }

      // 8. 【步骤2】在AI开始生成前，先创建占位项
      // 查询当前 qaList 的长度以确定新问题的索引
      const dbRecord = await this.aiInterviewResultModel.findOne({
        resultId: session.resultId,
      });
      const newQAIndex = dbRecord?.qaList?.length || 0; // 新问题的索引
      // AI 开始生成问题前，创建占位符
      await this.createInterviewQuestionPlaceholder(
        session.resultId,
        questionStartTime,
      );

      // 9. 记录AI生成的新问题（包含标准答案）到内存
      session.conversationHistory.push({
        role: 'interviewer',
        content: aiResponse.question,
        timestamp: questionStartTime, // ✅ 使用问题开始生成时的时间
        standardAnswer: aiResponse.standardAnswer, // 保存标准答案
      });

      // 10. 【步骤3】AI问题生成完成后，更新占位项的问题内容
      await this.updateInterviewQuestion(
        session.resultId,
        newQAIndex,
        aiResponse.question,
        questionStartTime,
      );

      // 11. 【步骤4】AI标准答案生成完成后，更新标准答案
      if (aiResponse.standardAnswer) {
        await this.updateInterviewStandardAnswer(
          session.resultId,
          newQAIndex,
          aiResponse.standardAnswer,
        );
      }

      // 12. 更新 sessionState 到数据库
      await this.aiInterviewResultModel.findOneAndUpdate(
        { resultId: session.resultId },
        {
          $set: {
            sessionState: session, // 同步会话状态
          },
        },
      );

      // 12. 判断是否结束面试
      if (aiResponse.shouldEnd) {
        // 面试结束
        session.isActive = false;

        // 保存面试结果
        const resultId = await this.saveMockInterviewResult(session);

        // 发送结束事件（标记流式完成）
        progressSubject.next({
          type: MockInterviewEventType.END,
          sessionId,
          content: aiResponse.question,
          resultId,
          elapsedMinutes,
          isStreaming: false, // 流式传输完成
          metadata: {
            totalQuestions: session.questionCount,
            interviewerName: session.interviewerName,
          },
        });

        // 清理会话（延迟清理，给前端一些时间获取结果）
        setTimeout(
          () => {
            this.interviewSessions.delete(sessionId);
            this.logger.log(`🗑️ 会话已清理: sessionId=${sessionId}`);
          },
          5 * 60 * 1000,
        ); // 5分钟后清理
      } else {
        // 继续面试 - 如果没有检测到标准答案，发送最终问题事件
        if (!hasStandardAnswer) {
          progressSubject.next({
            type: MockInterviewEventType.QUESTION,
            sessionId,
            interviewerName: session.interviewerName,
            content: aiResponse.question,
            questionNumber: session.questionCount,
            totalQuestions:
              session.interviewType === MockInterviewType.SPECIAL ? 12 : 8,
            elapsedMinutes,
            isStreaming: false, // 流式传输完成
          });

          // 发送等待事件
          progressSubject.next({
            type: MockInterviewEventType.WAITING,
            sessionId,
          });
        }
        // 注意：如果已经检测到标准答案，前面已经发送过 isStreaming: false 和 WAITING 事件了
      }

      progressSubject.complete();
    } catch (error) {
      throw error;
    }
  }

  /**
   * 保存模拟面试结果（面试结束时调用）
   * 如果已经通过实时保存创建了记录，则直接返回 resultId
   */
  private async saveMockInterviewResult(
    session: InterviewSession,
  ): Promise<string> {
    try {
      // 如果已经有 resultId（通过实时保存创建），直接返回
      if (session.resultId) {
        this.logger.log(
          `✅ 使用已有的结果ID: resultId=${session.resultId}（已通过实时保存）`,
        );

        // 更新面试结果和消费记录为完成状态
        await this.aiInterviewResultModel.findOneAndUpdate(
          { resultId: session.resultId },
          {
            $set: {
              status: 'completed',
              completedAt: new Date(),
              sessionState: session, // ✅ 保存最终会话状态（包含结束语）
            },
          },
        );

        // TODO：消费记录，回头再做
        if (session.consumptionRecordId) {
          // TODO：更新消费记录，回头再做
        }

        return session.resultId;
      }

      // 如果没有 resultId（没有启用实时保存或出错），使用原有逻辑创建完整记录
      const resultId = uuid();
      const recordId = uuid();

      // 构建问答列表（包含标准答案）
      const qaList: any[] = [];
      for (let i = 0; i < session.conversationHistory.length; i += 2) {
        if (i + 1 < session.conversationHistory.length) {
          qaList.push({
            question: session.conversationHistory[i].content,
            answer: session.conversationHistory[i + 1].content,
            standardAnswer: session.conversationHistory[i].standardAnswer, // 标准答案
            answerDuration: 0, // 文字面试无法准确计算
            answeredAt: session.conversationHistory[i + 1].timestamp,
          });
        }
      }

      // 计算面试时长
      const durationMinutes = Math.floor(
        (Date.now() - session.startTime.getTime()) / 1000 / 60,
      );

      // 创建面试结果
      await this.aiInterviewResultModel.create({
        resultId,
        user: new Types.ObjectId(session.userId),
        userId: session.userId,
        interviewType:
          session.interviewType === MockInterviewType.SPECIAL
            ? 'special'
            : 'behavior',
        company: session.company || '',
        position: session.positionName,
        salaryRange: session.salaryRange,
        jobDescription: session.jd,
        interviewDuration: durationMinutes,
        interviewMode: 'text',
        qaList,
        totalQuestions: qaList.length,
        answeredQuestions: qaList.length,
        status: 'completed', // 标记为已完成
        completedAt: new Date(),
        consumptionRecordId: recordId,
        metadata: {
          interviewerName: session.interviewerName,
          candidateName: session.candidateName,
        },
      });

      // TODO：创建消费记录，回头再做
      this.logger.log(
        `✅ 面试结果保存成功（完整创建）: resultId=${resultId}, duration=${durationMinutes}min`,
      );

      return resultId;
    } catch (error) {
      this.logger.error(`❌ 保存面试结果失败: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 【步骤1】创建问题占位项
   * 在AI开始生成问题前调用
   */
  private async createInterviewQuestionPlaceholder(
    resultId: string,
    askedAt: Date,
  ): Promise<void> {
    try {
      const placeholderItem = {
        question: '[生成中...]', // 占位文本
        answer: '', // 用户回答为空
        standardAnswer: '', // 标准答案为空
        answerDuration: 0,
        askedAt: askedAt,
        answeredAt: null,
      };

      const result = await this.aiInterviewResultModel.findOneAndUpdate(
        { resultId },
        {
          $push: { qaList: placeholderItem },
          $inc: { totalQuestions: 1 },
        },
        { new: true },
      );

      if (result) {
        this.logger.log(
          `✅ [步骤1] 创建问题占位项成功: resultId=${resultId}, qaList长度=${result.qaList.length}`,
        );
      } else {
        this.logger.error(
          `❌ [步骤1] 创建问题占位项失败: 未找到 resultId=${resultId}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `❌ [步骤1] 创建问题占位项异常: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * 【步骤2】更新问题内容
   * 在AI问题生成完成后调用
   */
  private async updateInterviewQuestion(
    resultId: string,
    qaIndex: number,
    question: string,
    askedAt: Date,
  ): Promise<void> {
    try {
      const result = await this.aiInterviewResultModel.findOneAndUpdate(
        { resultId },
        {
          $set: {
            [`qaList.${qaIndex}.question`]: question,
            [`qaList.${qaIndex}.askedAt`]: askedAt,
          },
        },
        { new: true },
      );

      if (result) {
        this.logger.log(
          `✅ [步骤2] 更新问题内容成功: resultId=${resultId}, qaIndex=${qaIndex}, question前50字=${question.substring(0, 50)}...`,
        );
      } else {
        this.logger.error(
          `❌ [步骤2] 更新问题内容失败: 未找到 resultId=${resultId}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `❌ [步骤2] 更新问题内容异常: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * 【步骤3】更新用户回答
   * 在用户提交回答时调用
   */
  private async updateInterviewAnswer(
    resultId: string,
    qaIndex: number,
    answer: string,
    answeredAt: Date,
    session?: InterviewSession, // 可选的 session，用于更新 sessionState
  ): Promise<void> {
    try {
      // 检查是否是第一次回答（避免重复增加计数）
      const existingRecord = await this.aiInterviewResultModel.findOne({
        resultId,
      });

      const isFirstAnswer =
        !existingRecord?.qaList[qaIndex]?.answer ||
        existingRecord.qaList[qaIndex].answer === '';

      const updateQuery: any = {
        $set: {
          [`qaList.${qaIndex}.answer`]: answer,
          [`qaList.${qaIndex}.answeredAt`]: answeredAt,
        },
      };

      // 如果传递了 session，同步更新 sessionState
      if (session) {
        updateQuery.$set.sessionState = session;
      }

      // 只有在第一次回答时才增加计数
      if (isFirstAnswer) {
        updateQuery.$inc = { answeredQuestions: 1 };
      }

      const result = await this.aiInterviewResultModel.findOneAndUpdate(
        { resultId },
        updateQuery,
        { new: true },
      );

      if (result) {
        this.logger.log(
          `✅ [步骤3] 更新用户回答成功: resultId=${resultId}, qaIndex=${qaIndex}, answer前50字=${answer.substring(0, 50)}..., isFirstAnswer=${isFirstAnswer}`,
        );
      } else {
        this.logger.error(
          `❌ [步骤3] 更新用户回答失败: 未找到 resultId=${resultId}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `❌ [步骤3] 更新用户回答异常: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * 【步骤4】更新标准答案
   * 在AI标准答案生成完成后调用
   */
  private async updateInterviewStandardAnswer(
    resultId: string,
    qaIndex: number,
    standardAnswer: string,
  ): Promise<void> {
    try {
      const result = await this.aiInterviewResultModel.findOneAndUpdate(
        { resultId },
        {
          $set: {
            [`qaList.${qaIndex}.standardAnswer`]: standardAnswer,
          },
        },
        { new: true },
      );

      if (result) {
        this.logger.log(
          `✅ [步骤4] 更新标准答案成功: resultId=${resultId}, qaIndex=${qaIndex}, standardAnswer前50字=${standardAnswer.substring(0, 50)}...`,
        );
      } else {
        this.logger.error(
          `❌ [步骤4] 更新标准答案失败: 未找到 resultId=${resultId}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `❌ [步骤4] 更新标准答案异常: ${error.message}`,
        error.stack,
      );
    }
  }
}
