import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

import * as dotenv from 'dotenv';
dotenv.config();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // 自动移除 DTO 中没有声明的字段
      forbidNonWhitelisted: true, // 有未声明字段就报错
      transform: true, // 自动类型转换
      transformOptions: {
        enableImplicitConversion: true, // 启用隐式转换
      },
    }),
  );

  await app.listen(process.env.PORT ?? 3001);
}
bootstrap();
