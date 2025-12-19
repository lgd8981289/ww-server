import { ResponseDto } from '../dto/response.dto';

export function ok<T>(data: T, message = 'ok'): ResponseDto<T> {
  return new ResponseDto<T>({ success: true, data, message });
}

export function fail(message: string): ResponseDto<null> {
  return new ResponseDto<null>({ success: false, data: null, message });
}
