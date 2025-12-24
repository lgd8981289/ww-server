import {
  Controller,
  Post,
  UseGuards,
  Body,
  Request,
  Res,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { InterviewService } from './services/interview.service';
import type { Response } from 'express';

@Controller('interview')
export class InterviewController {
  constructor(private readonly interviewService: InterviewService) {}
  // 接口 1：简历押题
  @Post('resume/quiz/stream')
  @UseGuards(JwtAuthGuard)
  async resumeQuizStream(@Body() dto, @Request() req, @Res() res) {}

  // 接口 2：开始模拟面试
  @Post('mock/start')
  @UseGuards(JwtAuthGuard)
  async startMockInterview(@Body() dto, @Request() req) {}

  // 接口 3：回答面试问题
  @Post('mock/answer')
  @UseGuards(JwtAuthGuard)
  async answerMockInterview(@Body() dto, @Request() req) {}

  // 接口 4：结束面试
  @Post('mock/end')
  @UseGuards(JwtAuthGuard)
  async endMockInterview(@Body() data, @Request() req) {}

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
}
