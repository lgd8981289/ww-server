import { PromptTemplate } from '@langchain/core/prompts';
import { JsonOutputParser } from '@langchain/core/output_parsers';
import { ChatDeepSeek } from '@langchain/deepseek';
import { ConfigService } from '@nestjs/config';
import { Injectable, Logger } from '@nestjs/common';
import { RESUME_QUIZ_PROMPT } from '../prompts/resume-quiz.prompts';

@Injectable()
export class InterviewService {
  private configService: ConfigService;
  // 日志打印的类
  private readonly logger = new Logger(InterviewService.name);
  // 大模型
  private model: ChatDeepSeek;
  constructor(configService: ConfigService) {
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
    const prompt = PromptTemplate.fromTemplate(RESUME_QUIZ_PROMPT);

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
}
