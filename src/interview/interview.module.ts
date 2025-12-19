import { Module } from '@nestjs/common';
import { InterviewController } from './interview.controller';
import { InterviewService } from './interview.service';

@Module({
  controllers: [InterviewController],
  providers: [InterviewService],
})
export class InterviewModule {}
