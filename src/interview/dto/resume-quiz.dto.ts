import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  MaxLength,
  IsOptional,
  MinLength,
  IsUUID,
  IsNumber,
  Min,
  Max,
} from 'class-validator';

/**
 * 简历押题请求 DTO
 */
export class ResumeQuizDto {
  @ApiProperty({
    description: '公司名称',
    example: '字节跳动',
    maxLength: 100,
  })
  @IsString()
  @IsOptional()
  @MaxLength(100, { message: '公司名称不能超过100个字符' })
  company?: string;

  @ApiProperty({
    description: '岗位名称',
    example: '前端开发工程师',
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty({ message: '岗位名称不能为空' })
  @MaxLength(100, { message: '岗位名称不能超过100个字符' })
  positionName: string;

  @ApiProperty({
    description: '最低薪资（单位：K）',
    example: 20,
    required: false,
  })
  @IsNumber({}, { message: '最低薪资必须是数字' })
  @Min(0, { message: '最低薪资不能小于0' })
  @Max(9999, { message: '最低薪资不能超过9999K' })
  @IsOptional()
  minSalary?: number;

  @ApiProperty({
    description: '最高薪资（单位：K）',
    example: 35,
    required: false,
  })
  @IsNumber({}, { message: '最高薪资必须是数字' })
  @Min(0, { message: '最高薪资不能小于0' })
  @Max(9999, { message: '最高薪资不能超过9999K' })
  @IsOptional()
  maxSalary?: number;

  @ApiProperty({
    description: '职位描述（JD）',
    example: '负责前端架构设计...',
    maxLength: 5000,
  })
  @IsString()
  @IsNotEmpty({ message: '职位描述不能为空' })
  @MinLength(50, { message: '职位描述至少50个字符，请提供详细的JD' })
  @MaxLength(2000, { message: '职位描述不能超过2000个字符' })
  jd: string;

  @ApiProperty({
    description: '简历ID（从简历列表中选择）',
    example: 'uuid-xxx-xxx',
    required: false,
  })
  @IsString()
  @IsOptional()
  resumeId?: string;

  @ApiProperty({
    description: '简历内容（直接传递文本，二选一）',
    example: '个人信息：张三...',
    required: false,
    maxLength: 10000,
  })
  @IsString()
  @IsOptional()
  @MaxLength(10000, { message: '简历内容不能超过10000个字符' })
  resumeContent?: string;

  @ApiProperty({
    description: '请求ID（用于幂等性，避免重复提交）',
    example: 'uuid-xxx-xxx',
    required: false,
  })
  @IsUUID('4', { message: '请求ID格式不正确' })
  @IsOptional()
  requestId?: string;

  @ApiProperty({
    description: '简历的线上地址',
    required: false,
  })
  @IsOptional()
  resumeURL?: string;

  @ApiProperty({
    description: 'Prompt版本（用于A/B测试）',
    example: 'v2',
    required: false,
  })
  @IsString()
  @IsOptional()
  promptVersion?: string;
}

/**
 * 简历押题响应 DTO（普通响应）
 */
export class ResumeQuizResponseDto {
  @ApiProperty({ description: '结果ID' })
  resultId: string;

  @ApiProperty({ description: '问题列表' })
  questions: any[];

  @ApiProperty({ description: '总结建议' })
  summary?: string;

  @ApiProperty({ description: '剩余次数' })
  remainingCount: number;

  @ApiProperty({ description: '消费记录ID' })
  consumptionRecordId: string;
}

/**
 * 流式响应进度事件 DTO
 */
export class ProgressEventDto {
  @ApiProperty({ description: '事件类型' })
  type: 'progress' | 'complete' | 'error';

  @ApiProperty({ description: '当前步骤（1-5）' })
  step?: number;

  @ApiProperty({ description: '步骤标签' })
  label?: string;

  @ApiProperty({ description: '进度百分比（0-100）' })
  progress?: number;

  @ApiProperty({ description: '消息' })
  message?: string;

  @ApiProperty({ description: '结果数据（仅在complete时返回）' })
  data?: ResumeQuizResponseDto;

  @ApiProperty({ description: '错误信息（仅在error时返回）' })
  error?: string;
}
