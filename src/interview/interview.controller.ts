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
}
