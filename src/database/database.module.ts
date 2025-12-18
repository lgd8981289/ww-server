import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Module({
  providers: [
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
  exports: ['DATABASE_CONNECTION'],
})
export class DatabaseModule {}
