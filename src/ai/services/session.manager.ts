import { Injectable, Logger } from '@nestjs/common';
import { Message, SessionData } from '../interfaces/message.interface';
import { v4 as generateUUID } from 'uuid';

/**
 * 会话管理服务
 *
 * 这个服务负责管理用户和 AI 的对话会话。
 * - 维护对话历史（内存存储）
 * - 管理会话的生命周期
 * - 提供会话数据的查询方法
 *
 * 为什么要在 AI 模块里？
 * 因为对话历史管理是 AI 交互的核心功能。
 * 任何涉及 AI 多轮对话的服务（简历分析、出题、评估等）都需要用到它。
 * 所以我们把它放在 AI 模块，作为通用服务供所有模块使用。
 */
@Injectable()
export class SessionManager {
  private readonly logger = new Logger(SessionManager.name);

  // 内存存储：sessionId → 对话历史
  private sessions = new Map<string, SessionData>();

  /**
   * 创建新会话
   *
   * @param userId 用户 ID
   * @param position 职位名称（用于 System Message）
   * @param systemMessage 系统消息（AI 的角色定义）
   * @returns 新建的 sessionId
   */
  createSession(
    userId: string,
    position: string,
    systemMessage: string,
  ): string {
    const sessionId = generateUUID();

    const sessionData: SessionData = {
      sessionId,
      userId,
      position,
      messages: [
        {
          role: 'system',
          content: systemMessage,
        },
      ],
      createdAt: new Date(),
      lastActivityAt: new Date(),
    };

    this.sessions.set(sessionId, sessionData);
    this.logger.log(
      `创建会话: ${sessionId}，用户: ${userId}，职位: ${position}`,
    );

    return sessionId;
  }

  /**
   * 向会话添加消息
   *
   * @param sessionId 会话 ID
   * @param role 消息角色（user 或 assistant）
   * @param content 消息内容
   */
  addMessage(
    sessionId: string,
    role: 'user' | 'assistant',
    content: string,
  ): void {
    const session = this.sessions.get(sessionId);

    if (!session) {
      throw new Error(`会话不存在: ${sessionId}`);
    }

    session.messages.push({
      role,
      content,
    });

    session.lastActivityAt = new Date();
    this.logger.debug(`添加消息到会话 ${sessionId}: ${role}`);
  }

  /**
   * 获取完整的对话历史
   *
   * @param sessionId 会话 ID
   * @returns 所有消息
   */
  getHistory(sessionId: string): Message[] {
    const session = this.sessions.get(sessionId);
    return session?.messages || [];
  }

  /**
   * 获取最近的 N 条消息（用于优化 Token 使用）
   *
   * 为什么要这样做？
   * 对话越长，token 越多，调用 AI 的成本越高。
   * 所以我们只保留最近的几条消息，旧的消息可以丢掉。
   * 但注意：System Message（第一条）一定要保留！
   *
   * @param sessionId 会话 ID
   * @param count 最近消息的数量（不包括 System Message）
   * @returns 包含 System Message + 最近 N 条消息的数组
   */
  getRecentMessages(sessionId: string, count: number = 10): Message[] {
    const history = this.getHistory(sessionId);

    if (history.length === 0) {
      return [];
    }

    // System Message 一定要保留（它是第一条）
    const systemMessage = history[0];

    // 获取最近 count 条消息
    const recentMessages = history.slice(-count);

    // 如果最近的消息中不包含 System Message，就加上
    if (recentMessages[0]?.role !== 'system') {
      return [systemMessage, ...recentMessages];
    }

    return recentMessages;
  }

  /**
   * 结束会话
   *
   * @param sessionId 会话 ID
   */
  endSession(sessionId: string): void {
    if (this.sessions.has(sessionId)) {
      this.sessions.delete(sessionId);
      this.logger.log(`结束会话: ${sessionId}`);
    }
  }

  /**
   * 清理过期会话（1 小时未活动）
   *
   * 在生产环境中，应该定期调用这个方法来清理内存。
   * 可以用 @Cron 装饰器在后台定期执行。
   */
  cleanupExpiredSessions(): void {
    const now = new Date();
    const expirationTime = 60 * 60 * 1000; // 1 小时

    for (const [sessionId, session] of this.sessions.entries()) {
      if (now.getTime() - session.lastActivityAt.getTime() > expirationTime) {
        this.logger.warn(`清理过期会话: ${sessionId}`);
        this.sessions.delete(sessionId);
      }
    }
  }
}
