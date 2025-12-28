import { Injectable, Logger } from '@nestjs/common';
import { PromptTemplate } from '@langchain/core/prompts';
import { AIModelFactory } from '../../ai/services/ai-model.factory';
import { Message } from '../../ai/interfaces/message.interface';
import { CONVERSATION_CONTINUATION_PROMPT } from '../prompts/resume-analysis.prompts';

/**
 * 对话继续服务
 *
 * 这个服务负责在已有的对话历史基础上，继续对话的 AI Chain。
 */
@Injectable()
export class ConversationContinuationService {
  private readonly logger = new Logger(ConversationContinuationService.name);

  constructor(private aiModelFactory: AIModelFactory) {}

  /**
   * 基于对话历史继续对话
   *
   * @param history 对话历史（Message 数组）
   * @returns AI 的回答内容
   */
  async continue(history: Message[]): Promise<string> {
    // 第一步：创建 Prompt 模板
    const prompt = PromptTemplate.fromTemplate(
      CONVERSATION_CONTINUATION_PROMPT,
    );

    // 第二步：获取模型
    const model = this.aiModelFactory.createDefaultModel();

    // 第三步：组建链
    const chain = prompt.pipe(model);

    try {
      this.logger.log(`继续对话，历史消息数: ${history.length}`);

      // 第四步：调用链
      const response = await chain.invoke({
        history: history.map((m) => `${m.role}: ${m.content}`).join('\n\n'),
      });

      // 第五步：获取回答内容
      const aiResponse = response.content as string;

      this.logger.log('对话继续完成');
      return aiResponse;
    } catch (error) {
      this.logger.error('继续对话失败:', error);
      throw error;
    }
  }
}
