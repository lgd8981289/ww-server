import { Module } from '@nestjs/common';
import { StsController } from './sts.controller';
import { StsService } from './sts.service';

@Module({
  controllers: [StsController],
  providers: [StsService],
})
export class StsModule {}
