export class ResponseDto<T = any> {
  success: boolean;
  data?: T;
  message?: string;

  constructor(partial: Partial<ResponseDto<T>>) {
    Object.assign(this, partial);
  }
}
