import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpStatus,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface ResponseFormat<T = any> {
  code: number;
  message: string;
  data: T;
  timestamp: string;
  path: string;
}

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<
  T,
  ResponseFormat<T>
> {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ResponseFormat<T>> {
    const ctx = context.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    return next.handle().pipe(
      map((data) => {
        // 处理空数据
        if (data === null || data === undefined) {
          return {
            code: HttpStatus.OK,
            message: '操作成功',
            data: null,
            timestamp: new Date().toISOString(),
            path: request.url,
          };
        }

        // 如果返回的数据已经是标准格式，直接返回
        if (
          data &&
          typeof data === 'object' &&
          'code' in data &&
          'message' in data
        ) {
          return {
            ...data,
            timestamp: new Date().toISOString(),
            path: request.url,
          };
        }

        // 标准成功响应格式
        return {
          code: HttpStatus.OK,
          message: '操作成功',
          data: data,
          timestamp: new Date().toISOString(),
          path: request.url,
        };
      }),
    );
  }
}
