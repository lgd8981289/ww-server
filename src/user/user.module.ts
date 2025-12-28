import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from './schemas/user.schema';
import {
  ConsumptionRecord,
  ConsumptionRecordSchema,
} from '../interview/schemas/consumption-record.schema';
import {
  UserConsumption,
  UserConsumptionSchema,
} from './schemas/consumption-record.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: ConsumptionRecord.name, schema: ConsumptionRecordSchema },
      { name: UserConsumption.name, schema: UserConsumptionSchema },
    ]),
  ], // 引入数据库模块
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService], // 导出服务，供其他模块使用
})
export class UserModule {}
