import { Module } from '@nestjs/common';
import { InterviewController } from './interview.controller';
import { InterviewService } from './services/interview.service';
import { InterviewAIService } from './services/interview-ai.service';
import { DocumentParserService } from './services/document-parser.service';

@Module({
  controllers: [InterviewController],
  providers: [InterviewService, InterviewAIService, DocumentParserService],
  exports: [InterviewService, InterviewAIService, DocumentParserService],
})
export class InterviewModule {}
