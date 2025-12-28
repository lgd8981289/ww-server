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

@Controller('interview')
export class InterviewController {
  constructor(private readonly interviewService: InterviewService) {}

  /**
   * 8.3-LangChain 实战-分析报告
   * @param body
   * @returns
   */
  @Post('/analyze-resume')
  @UseGuards(JwtAuthGuard)
  async analyzeResume(
    @Body() body: { position: string; resume: string; jobDescription: string },
    @Request() req: any,
  ) {
    const result = await this.interviewService.analyzeResume(
      req.user.userId,
      body.position,
      body.resume,
      body.jobDescription,
    );

    return {
      code: 200,
      data: result,
    };
  }

  /**
   * 8.4-对话历史和上下文管理
   * @param body
   * @returns
   */
  @Post('/continue-conversation')
  async continueConversation(
    @Body() body: { sessionId: string; question: string },
  ) {
    const result = await this.interviewService.continueConversation(
      body.sessionId,
      body.question,
    );

    return {
      code: 200,
      data: {
        response: result,
      },
    };
  }
}
