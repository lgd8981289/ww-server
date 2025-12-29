// src/interview/services/interview.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SessionManager } from '../../ai/services/session.manager';
import { ResumeAnalysisService } from './resume-analysis.service';
import { ConversationContinuationService } from './conversation-continuation.service';
import { RESUME_ANALYSIS_SYSTEM_MESSAGE } from '../prompts/resume-analysis.prompts';
import { Subject } from 'rxjs';
import { ResumeQuizDto } from '../dto/resume-quiz.dto';

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
    // 处理错误
    try {
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
      const interval = setInterval(() => {
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
      }, 1000);
    } catch (error) {
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
}
