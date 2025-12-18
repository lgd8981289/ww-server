import { Controller, Get, Sse } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { EventService } from '../common/services/event.service';

@Controller('interview')
export class InterviewController {
  constructor(private readonly eventService: EventService) {}

  @Sse('stream')
  stream(): Observable<MessageEvent> {
    // 测试 SSE 相应的数据
    setInterval(() => this.eventService.emit('我是相应的内容'), 2000);
    return this.eventService.getEvents().pipe(
      map(
        (data) =>
          ({
            data: JSON.stringify({ message: data }),
          }) as MessageEvent,
      ),
    );
  }
}
