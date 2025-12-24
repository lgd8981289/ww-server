import {
  Controller,
  Post,
  UseGuards,
  Body,
  Request,
  Res,
  Param,
  Get,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { InterviewService } from './services/interview.service';
import type { Response } from 'express';
import {
  StartMockInterviewDto,
  AnswerMockInterviewDto,
} from './dto/mock-interview.dto';

@Controller('interview')
export class InterviewController {
  constructor(private readonly interviewService: InterviewService) {}

  @Post('/analyze-resume')
  async analyzeResume(
    @Body() body: { resume: string; jobDescription: string },
  ) {
    const result = await this.interviewService.analyzeResume(
      body.resume,
      body.jobDescription,
    );

    return {
      code: 200,
      data: result,
    };
  }

  /**
   * 生成简历押题
   */
  @Post('/generate-quiz')
  async generateQuiz(
    @Body()
    body: {
      position: string;
      years: number;
      skills: string;
      recent_projects: string;
      job_description: string;
      education: string;
      question_count?: number;
    },
  ) {
    const questions = await this.interviewService.generateResumeQuiz(body);

    return {
      code: 200,
      message: '简历押题生成成功',
      data: questions,
    };
  }

  /**
   * 开始模拟面试 - SSE流式响应
   */
  @Post('mock/start')
  @UseGuards(JwtAuthGuard)
  async startMockInterview(
    @Body() dto: StartMockInterviewDto,
    @Request() req: any,
    @Res() res: Response,
  ) {
    const userId = req.user.userId;

    // 设置 SSE 响应头
    res.status(200);
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // 禁用 Nginx 缓冲
    res.setHeader('Access-Control-Allow-Origin', '*'); // 如果需要CORS

    // 发送初始注释，保持连接活跃
    res.write(': connected\n\n');
    // flush 数据（如果可用）
    if (typeof (res as any).flush === 'function') {
      (res as any).flush();
    }

    // 订阅进度事件
    const subscription = this.interviewService
      .startMockInterviewWithStream(userId, dto)
      .subscribe({
        next: (event) => {
          res.write(`data: ${JSON.stringify(event)}\n\n`);
          // flush 数据（如果可用）
          if (typeof (res as any).flush === 'function') {
            (res as any).flush();
          }
        },
        error: (error) => {
          res.write(
            `data: ${JSON.stringify({
              type: 'error',
              error: error.message,
            })}\n\n`,
          );
          if (typeof (res as any).flush === 'function') {
            (res as any).flush();
          }
          res.end();
        },
        complete: () => {
          res.end();
        },
      });

    // 客户端断开连接时取消订阅
    req.on('close', () => {
      subscription.unsubscribe();
    });
  }

  /**
   * 回答面试问题 - SSE流式响应
   */
  @Post('mock/answer')
  @UseGuards(JwtAuthGuard)
  async answerMockInterview(
    @Body() dto: AnswerMockInterviewDto,
    @Request() req: any,
    @Res() res: Response,
  ) {
    const userId = req.user.userId;

    // 设置 SSE 响应头
    res.status(200);
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // 禁用 Nginx 缓冲
    res.setHeader('Access-Control-Allow-Origin', '*'); // 如果需要CORS

    // 发送初始注释，保持连接活跃
    res.write(': connected\n\n');
    // flush 数据（如果可用）
    if (typeof (res as any).flush === 'function') {
      (res as any).flush();
    }

    // 订阅进度事件
    const subscription = this.interviewService
      .answerMockInterviewWithStream(userId, dto.sessionId, dto.answer)
      .subscribe({
        next: (event) => {
          res.write(`data: ${JSON.stringify(event)}\n\n`);
          // flush 数据（如果可用）
          if (typeof (res as any).flush === 'function') {
            (res as any).flush();
          }
        },
        error: (error) => {
          res.write(
            `data: ${JSON.stringify({
              type: 'error',
              error: error.message,
            })}\n\n`,
          );
          if (typeof (res as any).flush === 'function') {
            (res as any).flush();
          }
          res.end();
        },
        complete: () => {
          res.end();
        },
      });

    // 客户端断开连接时取消订阅
    req.on('close', () => {
      subscription.unsubscribe();
    });
  }

  /**
   * 结束面试（用户主动结束）
   * resultId 在 开始面试 接口中获取
   */
  @Post('mock/end')
  @UseGuards(JwtAuthGuard)
  async endMockInterview(
    @Body() body: { resultId: string },
    @Request() req: any,
  ) {
    await this.interviewService.endMockInterview(
      req.user.userId,
      body.resultId,
    );

    return {
      code: 200,
      message: '面试已结束，正在生成分析报告',
    };
  }

  /**
   * 获取分析报告
   * 统一接口，根据 resultId 自动识别类型（简历押题/专项面试/综合面试）
   */
  @Get('analysis/report/:resultId')
  @UseGuards(JwtAuthGuard)
  async getAnalysisReport(
    @Param('resultId') resultId: string,
    @Request() req: any,
  ) {
    const report = await this.interviewService.getAnalysisReport(
      req.user.userId,
      resultId,
    );

    return {
      code: 200,
      message: '查询成功',
      data: report,
    };
  }
}
