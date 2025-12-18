import { Injectable } from '@nestjs/common';
import { UserService } from '../user/user.service';

@Injectable()
export class InterviewService {
  constructor(private readonly userService: UserService) {} // 注入用户服务

  async createInterview(userId: number, interviewData: any) {
    // 验证用户是否存在
    const user = this.userService.findOne(userId);
    if (!user) {
      throw new Error('用户不存在');
    }

    // 创建面试记录
    // ...
  }
}
