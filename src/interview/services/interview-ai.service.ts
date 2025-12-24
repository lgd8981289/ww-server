import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { buildMockInterviewPrompt } from '../prompts/mock-interview.prompts';
import { PromptTemplate } from '@langchain/core/prompts';
import { ChatDeepSeek } from '@langchain/deepseek';
import { buildAssessmentPrompt } from '../dto/mock-interview.dto';
import { JsonOutputParser } from '@langchain/core/output_parsers';

/**
 * 面试 AI 服务
 * 封装 LangChain + DeepSeek 的调用
 */
@Injectable()
export class InterviewAIService {
  private readonly logger = new Logger(InterviewAIService.name);
  // 大模型
  private model: ChatDeepSeek;
  constructor(private readonly configService: ConfigService) {
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

  /**
   * 流式生成面试开场白（模拟打字机效果）
   * @param interviewerName 面试官姓名
   * @param candidateName 候选人姓名（可选）
   * @param positionName 岗位名称（可选）
   * @returns AsyncGenerator 流式返回内容片段
   */
  async *generateOpeningStatementStream(
    interviewerName: string,
    candidateName?: string,
    positionName?: string,
  ): AsyncGenerator<string, string, undefined> {
    // 生成完整开场白
    const fullGreeting = this.generateOpeningStatement(
      interviewerName,
      candidateName,
      positionName,
    );

    // 按字符分块，每次返回3-8个字符，模拟打字效果
    const chunkSize = 5;
    for (let i = 0; i < fullGreeting.length; i += chunkSize) {
      const chunk = fullGreeting.slice(i, i + chunkSize);
      yield chunk;
      // 添加小延迟模拟真实打字（可选）
      await new Promise((resolve) => setTimeout(resolve, 20));
    }

    return fullGreeting;
  }

  /**
   * 生成面试开场白（非流式）
   * @param interviewerName 面试官姓名
   * @param candidateName 候选人姓名（可选）
   * @param positionName 岗位名称（可选）
   * @returns 开场白
   */
  generateOpeningStatement(
    interviewerName: string,
    candidateName?: string,
    positionName?: string,
  ): string {
    let greeting = candidateName ? `${candidateName}` : '你';
    greeting += '好，我是你今天的面试官，你可以叫我';
    greeting += `${interviewerName}老师。\n\n`;

    if (positionName) {
      greeting += `我看到你申请的是${positionName}岗位。\n\n`;
    }

    greeting +=
      '让我们开始今天的面试吧。\n\n' +
      '首先，请你简单介绍一下自己。自我介绍可以说明你的学历以及专业背景、工作经历以及取得的成绩等。';

    return greeting;
  }

  /**
   * 流式生成面试问题（真正的流式响应）
   * @param context 面试上下文
   * @returns AsyncGenerator 流式返回内容片段
   */
  async *generateInterviewQuestionStream(context: {
    interviewType: 'special' | 'comprehensive';
    resumeContent: string;
    company?: string;
    positionName?: string;
    jd?: string;
    conversationHistory: Array<{
      role: 'interviewer' | 'candidate';
      content: string;
    }>;
    elapsedMinutes: number;
    targetDuration: number;
  }): AsyncGenerator<
    string,
    {
      question: string;
      shouldEnd: boolean;
      standardAnswer?: string;
      reasoning?: string;
    },
    undefined
  > {
    try {
      const prompt = buildMockInterviewPrompt(context);
      const promptTemplate = PromptTemplate.fromTemplate(prompt);
      const chain = promptTemplate.pipe(this.model);

      this.logger.log(
        `🤖 开始流式生成面试问题: type=${context.interviewType}, elapsed=${context.elapsedMinutes}min`,
      );

      let fullContent = '';
      const startTime = Date.now();

      // 使用 stream() 进行流式生成
      const stream = await chain.stream({
        interviewType: context.interviewType,
        resumeContent: context.resumeContent,
        company: context.company || '',
        positionName: context.positionName || '未提供',
        jd: context.jd || '未提供',
        conversationHistory: this.formatConversationHistory(
          context.conversationHistory,
        ),
        elapsedMinutes: context.elapsedMinutes,
        targetDuration: context.targetDuration,
      });

      // 逐块返回内容
      for await (const chunk of stream) {
        const content = chunk.content?.toString() || '';
        if (content) {
          fullContent += content;
          yield content; // 立即返回给调用方
        }
      }

      const duration = Date.now() - startTime;
      this.logger.log(
        `✅ 流式生成完成: 耗时=${duration}ms, 长度=${fullContent.length}`,
      );

      // 返回最终解析结果
      return this.parseInterviewResponse(fullContent, context);
    } catch (error) {
      this.logger.error(
        `❌ 流式生成面试问题失败: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * 格式化对话历史
   */
  private formatConversationHistory(
    history: Array<{ role: 'interviewer' | 'candidate'; content: string }>,
  ): string {
    if (!history || history.length === 0) {
      return '（对话刚开始，这是候选人的自我介绍）';
    }

    return history
      .map((item, index) => {
        const role = item.role === 'interviewer' ? '面试官' : '候选人';
        return `${index + 1}. ${role}: ${item.content}`;
      })
      .join('\n\n');
  }

  /**
   * 解析AI的面试回应
   */
  private parseInterviewResponse(
    content: string,
    context: {
      elapsedMinutes: number;
      targetDuration: number;
    },
  ): {
    question: string;
    shouldEnd: boolean;
    standardAnswer?: string;
    reasoning?: string;
  } {
    // 检查是否包含结束标记
    const shouldEnd = content.includes('[END_INTERVIEW]');

    // 提取标准答案
    let standardAnswer: string | undefined;
    let questionContent = content;

    const standardAnswerMatch = content.match(
      /\[STANDARD_ANSWER\]([\s\S]*?)(?=\[END_INTERVIEW\]|$)/,
    );
    if (standardAnswerMatch) {
      standardAnswer = standardAnswerMatch[1].trim();
      // 移除标准答案部分，只保留问题
      questionContent = content.split('[STANDARD_ANSWER]')[0].trim();
    }

    // 移除结束标记
    questionContent = questionContent.replace(/\[END_INTERVIEW\]/g, '').trim();

    return {
      question: questionContent,
      shouldEnd: shouldEnd,
      standardAnswer: standardAnswer,
      reasoning: shouldEnd
        ? `面试已达到目标时长（${context.elapsedMinutes}/${context.targetDuration}分钟）`
        : undefined,
    };
  }

  /**
   * 生成面试评估报告
   * 基于用户的回答分析生成完整的评估报告
   */
  async generateInterviewAssessmentReport(context: {
    interviewType: 'special' | 'comprehensive';
    company?: string;
    positionName?: string;
    jd?: string;
    resumeContent: string;
    qaList: Array<{
      question: string;
      answer: string;
      standardAnswer?: string;
    }>;
    answerQualityMetrics?: {
      totalQuestions: number;
      avgAnswerLength: number;
      emptyAnswersCount: number;
    };
  }): Promise<{
    overallScore: number;
    overallLevel: string;
    overallComment: string;
    radarData: Array<{
      dimension: string;
      score: number;
      description?: string;
    }>;
    strengths: string[];
    weaknesses: string[];
    improvements: Array<{
      category: string;
      suggestion: string;
      priority: 'high' | 'medium' | 'low';
    }>;
    fluencyScore: number;
    logicScore: number;
    professionalScore: number;
  }> {
    try {
      const prompt = buildAssessmentPrompt(context);
      const promptTemplate = PromptTemplate.fromTemplate(prompt);
      const chain = promptTemplate.pipe(this.model);

      this.logger.log(
        `🤖 开始生成面试评估报告: type=${context.interviewType}, qaCount=${context.qaList.length}`,
      );

      const startTime = Date.now();

      // 使用 JSON 输出解析器
      const parser = new JsonOutputParser();
      const chainWithParser = promptTemplate.pipe(this.model).pipe(parser);

      const result: any = await chainWithParser.invoke({
        interviewType: context.interviewType,
        company: context.company || '',
        positionName: context.positionName || '未提供',
        jd: context.jd || '未提供',
        resumeContent: context.resumeContent,
        qaList: context.qaList
          .map(
            (qa, index) =>
              `问题${index + 1}: ${qa.question}\n用户回答: ${qa.answer}\n回答长度: ${qa.answer.length}字\n标准答案: ${qa.standardAnswer || '无'}`,
          )
          .join('\n\n'),
        totalQuestions: context.qaList.length,
        qualityMetrics: context.answerQualityMetrics
          ? `\n## 回答质量统计\n- 总问题数: ${context.answerQualityMetrics.totalQuestions}\n- 平均回答长度: ${context.answerQualityMetrics.avgAnswerLength}字\n- 无效回答数: ${context.answerQualityMetrics.emptyAnswersCount}`
          : '',
      });

      const duration = Date.now() - startTime;
      this.logger.log(
        `✅ 评估报告生成完成: 耗时=${duration}ms, overallScore=${result.overallScore}`,
      );

      return {
        overallScore: result.overallScore || 75,
        overallLevel: result.overallLevel || '良好',
        overallComment: result.overallComment || '面试表现良好',
        radarData: result.radarData || [],
        strengths: result.strengths || [],
        weaknesses: result.weaknesses || [],
        improvements: result.improvements || [],
        fluencyScore: result.fluencyScore || 80,
        logicScore: result.logicScore || 80,
        professionalScore: result.professionalScore || 80,
      };
    } catch (error) {
      this.logger.error(`❌ 生成评估报告失败: ${error.message}`, error.stack);
      throw error;
    }
  }
}
