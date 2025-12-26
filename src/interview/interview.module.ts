import { Module } from '@nestjs/common';
import { InterviewController } from './interview.controller';
import { InterviewService } from './interview.service';
import { UserModule } from '../user/user.module'; // 导入用户模块
import { EventService } from '../common/services/event.service';

@Module({
  imports: [UserModule], // 导入用户模块，可以使用 UserService
  controllers: [InterviewController],
  providers: [InterviewService, EventService],
})
export class InterviewModule {}
