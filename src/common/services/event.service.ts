import { Injectable } from '@nestjs/common';
import { Subject, Observable, interval } from 'rxjs';
import { map, tap } from 'rxjs/operators';

@Injectable()
export class EventService {
  // 创建一个 Subject，用来广播事件
  private eventSubject = new Subject<string>();

  /**
   * 发送一个事件
   */
  emit(message: string) {
    this.eventSubject.next(message);
  }

  /**
   * 获取事件流的 Observable
   */
  getEvents(): Observable<string> {
    return this.eventSubject.asObservable();
  }

  /**
   * 生成一个定时推送的 Observable
   */
  generateTimedMessages(): Observable<string> {
    return interval(1000).pipe(
      map((count) => `这是第 ${count + 1} 条消息`),
      tap((message) => {
        console.log('推送消息:', message);
      }),
    );
  }
}
