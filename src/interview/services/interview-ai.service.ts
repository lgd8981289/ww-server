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
}
