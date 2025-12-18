import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule], // 引入数据库模块
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService], // 导出服务，供其他模块使用
})
export class UserModule {}
