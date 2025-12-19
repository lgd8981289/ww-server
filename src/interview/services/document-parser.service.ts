import { Injectable, Logger } from '@nestjs/common';

/**
 * 文档解析服务
 * 支持从 URL 下载并解析 PDF、DOCX 等格式的简历文件
 */
@Injectable()
export class DocumentParserService {
  private readonly logger = new Logger(DocumentParserService.name);
}
