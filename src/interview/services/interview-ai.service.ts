import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * 面试 AI 服务
 * 封装 LangChain + DeepSeek 的调用
 */
@Injectable()
export class InterviewAIService {
  private readonly logger = new Logger(InterviewAIService.name);

  constructor(private readonly configService: ConfigService) {}

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
}
