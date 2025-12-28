import { Module } from '@nestjs/common';
import { InterviewController } from './interview.controller';
import { InterviewService } from './services/interview.service';
import { InterviewAIService } from './services/interview-ai.service';
import { DocumentParserService } from './services/document-parser.service';
import { ConfigModule } from '@nestjs/config';
import { AIModule } from '../ai/ai.module';
import { ResumeAnalysisService } from './services/resume-analysis.service';
import { ConversationContinuationService } from './services/conversation-continuation.service';

@Module({
  imports: [
    ConfigModule,
    AIModule, // 导入 AI 模块以使用 AIModelFactory
    // MongooseModule.forFeature([...]),
  ],
  controllers: [InterviewController],
  providers: [
    InterviewService,
    InterviewAIService,
    DocumentParserService,
    ResumeAnalysisService,
    ConversationContinuationService,
  ],
  exports: [InterviewService, InterviewAIService, DocumentParserService],
})
export class InterviewModule {}
