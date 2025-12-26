import { Module } from '@nestjs/common';
import { EventService } from './services/event.service';

@Module({
  providers: [EventService],
  exports: [EventService], // 导出，让其他模块也能用
})
export class CommonModule {}
