// src/ai/ai.module.ts
import { Module } from '@nestjs/common';
import { AIModelFactory } from './services/ai-model.factory';
import { SessionManager } from './services/session.manager';

/**
 * AI 模块
 *
 * 这个模块集中管理所有的 AI 相关服务：
 * - AIModelFactory：AI 模型工厂（初始化模型）
 * - SessionManager：会话管理（管理对话历史）
 *
 * 任何需要用到 AI 的模块，都应该导入这个 AIModule。
 */
@Module({
  providers: [AIModelFactory, SessionManager],
  exports: [AIModelFactory, SessionManager], // 导出，这样其他模块可以使用
})
export class AIModule {}
