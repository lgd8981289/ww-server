import { Module } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserModule } from './user/user.module';
import { WechatModule } from './wechat/wechat.module';
import { PaymentModule } from './payment/payment.module';
import { StsModule } from './sts/sts.module';
import { InterviewModule } from './interview/interview.module';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { JwtStrategy } from './auth/jwt.strategy';
import { getTokenExpirationSeconds } from './common/utils/jwt.util';

@Module({
  imports: [
    // 加载环境变量配置
    ConfigModule.forRoot({
      envFilePath: '.env.development',
      isGlobal: true,
    }),

    // 连接 MongoDB 数据库
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        return {
          // 从环境变量中获取 MongoDB 连接 URI，如果没有则使用默认值
          uri:
            configService.get<string>('MONGODB_URI') ||
            'mongodb://localhost:27017/wwzhidao',
        };
      },
      inject: [ConfigService],
    }),

    // 配置 JWT 模块
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const expirationSeconds = getTokenExpirationSeconds();
        return {
          // 从环境变量中获取 JWT 密钥，如果没有则使用默认值
          secret: configService.get<string>('JWT_SECRET') || 'wwzhidao-secret',

          // 设置 JWT 过期时间，单位为秒
          signOptions: {
            expiresIn: expirationSeconds,
          },
        };
      },
      inject: [ConfigService],
      global: true, // 将 JWT 模块设置为全局模块，这样在其他模块中就不需要再次导入 JwtModule 了
    }),

    PassportModule,
    UserModule,
    WechatModule,
    PaymentModule,
    StsModule,
    InterviewModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    JwtStrategy,
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseInterceptor,
    },
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
  ],
})
export class AppModule {}
