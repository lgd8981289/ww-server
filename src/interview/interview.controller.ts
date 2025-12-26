import { Controller, Get, Sse } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { EventService } from '../common/services/event.service';

@Controller('interview')
export class InterviewController {
  constructor(private readonly eventService: EventService) {}

  /**
   * SSE 接口：实时推送消息
   */
  @Sse('stream')
  stream(): Observable<MessageEvent> {
    return this.eventService.generateTimedMessages().pipe(
      map(
        (message) =>
          ({
            data: JSON.stringify({
              timestamp: new Date().toISOString(),
              message: message,
            }),
          }) as MessageEvent,
      ),
    );
  }
}
