import { Injectable } from '@nestjs/common';
import { Subject, Observable } from 'rxjs';

@Injectable()
export class EventService {
  private eventSubject = new Subject<string>();

  emit(event: string) {
    this.eventSubject.next(event);
  }

  getEvents(): Observable<string> {
    return this.eventSubject.asObservable();
  }
}
