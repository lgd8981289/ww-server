import { Module } from '@nestjs/common';
import { InterviewController } from './interview.controller';
import { InterviewService } from './services/interview.service';
import { InterviewAIService } from './services/interview-ai.service';
import { DocumentParserService } from './services/document-parser.service';
import { ConfigModule } from '@nestjs/config';
import { AIModule } from '../ai/ai.module';
import { ResumeAnalysisService } from './services/resume-analysis.service';
import { ConversationContinuationService } from './services/conversation-continuation.service';
import { MongooseModule } from '@nestjs/mongoose';
import {
  ConsumptionRecord,
  ConsumptionRecordSchema,
} from './schemas/consumption-record.schema';
import {
  ResumeQuizResult,
  ResumeQuizResultSchema,
} from './schemas/interview-quiz-result.schema';
import { User, UserSchema } from '../user/schemas/user.schema';

@Module({
  imports: [
    ConfigModule,
    AIModule, // 导入 AI 模块以使用 AIModelFactory
    MongooseModule.forFeature([
      { name: ConsumptionRecord.name, schema: ConsumptionRecordSchema },
      { name: ResumeQuizResult.name, schema: ResumeQuizResultSchema },
      { name: User.name, schema: UserSchema },
    ]),
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
