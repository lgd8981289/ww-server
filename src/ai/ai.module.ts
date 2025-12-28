import { Module } from '@nestjs/common';
import { AIModelFactory } from './services/ai-model.factory';

/**
 * AI 模块
 *
 * 这个模块集中管理所有的 AI 相关服务。
 * 目前只有 AIModelFactory 服务。
 */
@Module({
  providers: [AIModelFactory],
  exports: [AIModelFactory], // 导出，这样其他模块可以使用
})
export class AIModule {}
