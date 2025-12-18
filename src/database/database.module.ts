import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DatabaseService } from './database.service';

@Module({
  imports: [
    // 确保能注入 ConfigService（你在 AppModule 里已经把 ConfigModule 设为 global，这里写不写 imports 都可以，但写上更清晰）
    ConfigModule,
  ],
  providers: [
    DatabaseService,
    {
      provide: 'DATABASE_CONNECTION',
      useFactory: (configService: ConfigService) => {
        const dbType = configService.get('DB_TYPE', 'mongodb');

        if (dbType === 'mongodb') {
          return {
            type: 'mongodb',
            uri: configService.get('MONGODB_URI'),
          };
        } else if (dbType === 'postgres') {
          return {
            type: 'postgres',
            host: configService.get('POSTGRES_HOST'),
            port: configService.get('POSTGRES_PORT'),
            database: configService.get('POSTGRES_DB'),
          };
        }

        throw new Error(`不支持的数据库类型: ${dbType}`);
      },
      inject: [ConfigService],
    },
  ],
  exports: [
    'DATABASE_CONNECTION',
    DatabaseService, // 关键：导出给其他模块使用
  ],
})
export class DatabaseModule {}
