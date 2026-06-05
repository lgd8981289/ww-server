import { HttpStatus } from '@nestjs/common';
import { timestamp } from 'rxjs';

export class ResponseUtil {
  // TODO: 统一响应格式工具类, static 方法可以直接通过类名调用，无需实例化。

  /**
   * success 方法用于生成成功的响应对象
   * @param data 响应数据
   * @param message 响应消息
   * @param code 响应状态码
   * @returns 响应对象
   */
  static success<T = any>(
    data: T,
    message: string = '操作成功',
    code: number = HttpStatus.OK,
  ) {
    return {
      code,
      message,
      data,
      timestamp: new Date().toISOString(), // 添加时间戳，记录响应的时间
    };
  }

  /**
   * error 方法用于生成错误的响应对象
   * @param data 响应数据
   * @param message 响应消息
   * @param code 响应状态码
   * @returns 响应对象
   */
  static error(
    data: any = null, // 错误时可以选择性地返回一些数据，例如错误详情或者错误码等，默认为 null。
    message: string = '操作失败',
    code: number = HttpStatus.BAD_REQUEST,
  ) {
    return {
      code,
      message,
      data,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * paginated 方法用于生成分页响应对象，包含分页信息和数据列表
   * @param data 当前页的数据列表
   * @param pagination 分页信息
   * @param message 响应消息
   * @param code 响应状态码
   * @returns 响应对象
   */
  static paginated<T = any>(
    data: T[], // 当前页的数据列表
    pagination: {
      total: number; // 总记录数
      limit: number; // 每页记录数
      totalPages: number; // 总页数
      page: number; // 当前页码
    },
    message: string = '操作成功',
    code: number = HttpStatus.OK,
  ) {
    return {
      code,
      message,
      data,
      pagination,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * list 方法用于生成列表响应对象，包含数据列表和基本响应信息，适用于不需要分页的场景
   * @param data 数据列表
   * @param message 响应消息
   * @param code 响应状态码
   * @returns 响应对象
   */
  static list<T = any>(
    data: T[], // 数据列表
    message: string = '操作成功',
    code: number = HttpStatus.OK,
  ) {
    return {
      code,
      message,
      data,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * empty 方法用于生成空响应对象，适用于没有数据返回但需要表示操作成功的场景
   * @param message 响应消息
   * @param code 响应状态码
   * @returns 响应对象
   */
  static empty(message: string = '操作成功', code: number = HttpStatus.OK) {
    return {
      code,
      message,
      data: null,
      timestamp: new Date().toISOString(),
    };
  }
}
