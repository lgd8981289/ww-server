import { catchError } from 'rxjs/operators';
import { of, throwError, Observable } from 'rxjs';

const errorSource = new Observable((subscriber) => {
  subscriber.next(1);
  subscriber.next(2);
  subscriber.error(new Error('Something went wrong!'));
});

errorSource
  .pipe(
    catchError((error) => {
      console.log('捕获到错误:', error.message);
      // 可以返回一个新的 Observable，继续处理
      return of('恢复了');
    }),
  )
  .subscribe((value) => {
    console.log('收到:', value);
  });
