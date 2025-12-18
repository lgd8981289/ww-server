import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class DatabaseService {
  constructor(private configService: ConfigService) {}

  getConnectionString(): string {
    return this.configService.getOrThrow<string>('MONGODB_URI');
  }

  getPort(): number {
    return this.configService.get<number>('PORT', 3000);
  }
}
