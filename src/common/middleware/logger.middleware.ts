import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger(LoggerMiddleware.name);

  use(req: Request, res: Response, next: NextFunction) {
    const { method, originalUrl, ip, headers } = req;
    const userAgent = headers['user-agent'] || '';
    const startTime = Date.now();

    // 记录请求开始
    this.logger.log(`→ ${method} ${originalUrl} - ${ip} - ${userAgent}`);

    // 监听响应完成事件
    res.on('finish', () => {
      const { statusCode } = res;
      const responseTime = Date.now() - startTime;
      const logLevel = statusCode >= 400 ? 'error' : 'log';

      // 记录请求完成
      this.logger[logLevel](
        `← ${method} ${originalUrl} ${statusCode} - ${responseTime}ms - ${ip}`,
      );
    });

    next();
  }
}
