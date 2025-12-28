import { PromptTemplate } from '@langchain/core/prompts';
import { JsonOutputParser } from '@langchain/core/output_parsers';
import { ConfigService } from '@nestjs/config';
import { Injectable, Logger } from '@nestjs/common';
import { AIModelFactory } from '../../ai/services/ai-model.factory';
import { RESUME_QUIZ_PROMPT } from '../prompts/resume-quiz.prompts';

/**
 * 面试服务
 *
 * 这个服务处理与面试相关的业务逻辑。
 * 它依赖于 AIModelFactory 来获取 AI 模型，而不是自己初始化模型。
 *
 * 好处：
 * - 关注点分离：InterviewService 只关心业务逻辑，AI 模型的初始化交给 AIModelFactory
 * - 易于切换：如果以后要换 AI 模型，只需要改 AIModelFactory，InterviewService 不用改
 * - 易于测试：可以 mock AIModelFactory，不用真实调用 API
 */
@Injectable()
export class InterviewService {
  private readonly logger = new Logger(InterviewService.name);

  constructor(
    private configService: ConfigService,
    private aiModelFactory: AIModelFactory, // 注入 AI 模型工厂
  ) {}

  /**
   * 分析简历并生成报告
   *
   * @param resumeContent - 简历的文本内容
   * @param jobDescription - 岗位要求
   * @returns 分析结果，包含工作年限、技能、匹配度等信息
   */
  async analyzeResume(resumeContent: string, jobDescription: string) {
    // 创建 Prompt 模板
    const prompt = PromptTemplate.fromTemplate(RESUME_QUIZ_PROMPT);

    // 通过工厂获取模型（而不是自己初始化）
    const model = this.aiModelFactory.createDefaultModel();

    // 创建输出解析器
    const parser = new JsonOutputParser();

    // 创建链：Prompt → 模型 → 解析器
    const chain = prompt.pipe(model).pipe(parser);

    // 调用链
    try {
      this.logger.log('开始分析简历...');

      const result = await chain.invoke({
        resume_content: resumeContent,
        job_description: jobDescription,
      });

      this.logger.log('简历分析完成');
      return result;
    } catch (error) {
      this.logger.error('简历分析失败:', error);
      throw error;
    }
  }
}
