import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  MaxLength,
  IsEnum,
  IsOptional,
  Min,
  Max,
} from 'class-validator';

/**
 * 模拟面试事件类型
 */
export enum MockInterviewEventType {
  START = 'start', // 面试开始
  QUESTION = 'question', // 面试官提问
  WAITING = 'waiting', // 等待候选人回答
  REFERENCE_ANSWER = 'reference_answer', // 参考答案（标准答案）
  THINKING = 'thinking', // AI正在思考
  END = 'end', // 面试结束
  ERROR = 'error', // 发生错误
}

/**
 * 面试类型枚举
 */
export enum MockInterviewType {
  SPECIAL = 'special', // 专项面试（约1小时）
  COMPREHENSIVE = 'behavior', // 行测 + HR 面试（约45分钟）
}

/**
 * 开始模拟面试请求 DTO
 */
export class StartMockInterviewDto {
  @ApiProperty({
    description: '面试类型',
    enum: MockInterviewType,
    example: MockInterviewType.SPECIAL,
  })
  @IsEnum(MockInterviewType, { message: '面试类型无效' })
  @IsNotEmpty({ message: '面试类型不能为空' })
  interviewType: MockInterviewType;

  @ApiProperty({
    description: '候选人姓名（可选）',
    example: '张三',
    required: false,
    maxLength: 50,
  })
  @IsString()
  @IsOptional()
  @MaxLength(50, { message: '候选人姓名不能超过50个字符' })
  candidateName?: string;

  @ApiProperty({
    description: '公司名称（可选）',
    example: '字节跳动',
    required: false,
    maxLength: 100,
  })
  @IsString()
  @IsOptional()
  @MaxLength(100, { message: '公司名称不能超过100个字符' })
  company?: string;

  @ApiProperty({
    description: '岗位名称（可选）',
    example: '前端开发工程师',
    required: false,
    maxLength: 100,
  })
  @IsString()
  @IsOptional()
  @MaxLength(100, { message: '岗位名称不能超过100个字符' })
  positionName?: string;

  @ApiProperty({
    description: '最低薪资（单位：K）',
    example: 20,
    required: false,
  })
  @Min(0, { message: '最低薪资不能小于0' })
  @Max(9999, { message: '最低薪资不能超过9999K' })
  @IsOptional()
  minSalary?: number | string;

  @ApiProperty({
    description: '最高薪资（单位：K）',
    example: 35,
    required: false,
  })
  @Min(0, { message: '最高薪资不能小于0' })
  @Max(9999, { message: '最高薪资不能超过9999K' })
  @IsOptional()
  maxSalary?: number | string;

  @ApiProperty({
    description: '职位描述（JD）（可选）',
    example: '负责前端架构设计...',
    required: false,
    maxLength: 5000,
  })
  @IsString()
  @IsOptional()
  @MaxLength(5000, { message: '职位描述不能超过5000个字符' })
  jd?: string;

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
  resumeContent: string;
}

/**
 * 候选人回答请求 DTO
 */
export class AnswerMockInterviewDto {
  @ApiProperty({
    description: '面试会话ID',
    example: 'uuid-xxx-xxx',
  })
  @IsString()
  @IsNotEmpty({ message: '面试会话ID不能为空' })
  sessionId: string;

  @ApiProperty({
    description: '候选人的回答',
    example: '我叫张三，毕业于清华大学...',
    maxLength: 5000,
  })
  @IsString()
  @IsNotEmpty({ message: '回答内容不能为空' })
  @MaxLength(5000, { message: '回答内容不能超过5000个字符' })
  answer: string;
}

/**
 * 构建模拟面试的 Prompt
 */
export function buildMockInterviewPrompt(context: {
  interviewType: 'special' | 'comprehensive';
  elapsedMinutes: number;
  targetDuration: number;
}): string {
  const interviewTypeDesc =
    context.interviewType === 'special'
      ? '专项面试（技术深度为主）'
      : '综合面试（行测题 + HR面试）';

  const shouldConsiderEnding =
    context.elapsedMinutes >= context.targetDuration * 0.8; // 达到80%时长

  return `# 角色设定
你是一位经验丰富的面试官，正在进行一场${interviewTypeDesc}。

# 面试信息
- **面试类型**: {interviewType}
- **公司**: {company}
- **岗位**: {positionName}
- **职位描述**: {jd}
- **已用时间**: {elapsedMinutes}分钟
- **目标时长**: {targetDuration}分钟

# 候选人简历
{resumeContent}

# 对话历史
{conversationHistory}

# 任务要求

${
  shouldConsiderEnding
    ? `⚠️ **重要**: 已经进行了${context.elapsedMinutes}分钟，接近目标时长${context.targetDuration}分钟。
如果当前话题已经讨论完毕，应该准备结束面试。`
    : ''
}

## 面试策略

${
  context.interviewType === 'special'
    ? `### 专项面试策略（技术深度）
1. **开场阶段**（0-5分钟）：自我介绍、项目经历概述
2. **技术深度阶段**（5-40分钟）：
   - 深挖简历中的技术栈和项目经验
   - 提问要有针对性，逐层深入
   - 根据候选人回答追问技术细节
3. **问题解决阶段**（40-50分钟）：场景题、算法题、系统设计
4. **结束阶段**（50-60分钟）：候选人提问、面试结束

**问题风格**：
- 技术问题占80%，行为问题占20%
- 深入考察技术原理、架构设计、性能优化等
- 根据候选人回答灵活调整难度`
    : `### 综合面试策略（行测 + HR）
1. **开场阶段**（0-5分钟）：自我介绍
2. **HR面试阶段**（5-25分钟）：
   - 职业规划、团队协作
   - 压力管理、学习能力
   - 为什么选择我们公司
   - 为什么离职
   - 你的缺点是什么
3. **行测题阶段**（25-40分钟）：
   - 逻辑推理题（2-3题）
   - 数字计算题（1-2题）
   - 语言理解题（1-2题）
4. **结束阶段**（40-45分钟）：候选人提问、面试结束

**问题风格**：
- 行测题要清晰明确，有标准答案
- HR问题关注软技能、价值观匹配
- 语气要友好、鼓励候选人表达`
}

## 输出要求

根据候选人的最新回答，生成你的下一个回应。你的回应应该按以下格式输出：

1. **如果面试应该继续**：
   - 先对候选人的回答给出简短评价（1-2句话）
   - 然后提出下一个问题
   - 问题要有针对性，与简历或之前的回答相关
   - 自然过渡，模拟真实面试场景
   - **在问题后，用 [STANDARD_ANSWER] 标记开始，给出该问题的标准答案或参考答案**

2. **如果面试应该结束**：
   ${
     shouldConsiderEnding
       ? `- 当前已接近目标时长，如果话题已完整，应该结束
   - 以"好的，今天的面试就到这里"或类似话语开始
   - 简要总结候选人的表现
   - 告知后续流程（如"我们会在3-5个工作日内给你答复"）
   - 在结束语后单独一行输出: [END_INTERVIEW]`
       : `- 只有在达到目标时长且话题完整时才结束面试
   - 结束时要输出: [END_INTERVIEW]`
   }

## 输出格式示例

**继续面试的格式：**
\`\`\`
很好，你对Vue3的理解很深入。那我想进一步了解，你在实际项目中是如何优化Vue3应用性能的？能否举一个具体的例子？

[STANDARD_ANSWER]
Vue3 性能优化的参考答案：
1. 使用 v-memo 指令减少不必要的重渲染
2. 合理使用 computed 和 watch，避免过度计算
3. 使用虚拟滚动处理长列表
4. 组件懒加载和异步组件
5. 使用 shallowRef 和 shallowReactive 优化响应式数据
6. 合理使用 keep-alive 缓存组件
7. 生产环境移除 console 和调试代码
具体例子应该包含：问题场景、优化方案、优化效果（如加载时间从5秒降到2秒）。
\`\`\`

**结束面试的格式：**
\`\`\`
好的，今天的面试就到这里。整体来看，你的技术能力不错，特别是在Vue3的实践经验方面。我们会将你的面试情况反馈给用人部门，预计3-5个工作日内会给你答复。祝你一切顺利！

[END_INTERVIEW]
\`\`\`

## 注意事项
- 保持面试官的专业性和友好度
- 问题要具体，避免过于宽泛
- 根据候选人的回答质量调整问题难度
- 每次只问一个问题（除非是关联的子问题）
- 不要重复已经问过的问题
- 面试时长控制很重要，不要无限延长
- **标准答案要详细且实用，包含关键要点和示例**
- **标准答案应该符合行业最佳实践**

现在，请给出你的回应：`;
}

/**
 * 构建评估报告生成的 Prompt
 */
export function buildAssessmentPrompt(context: {
  interviewType: 'special' | 'comprehensive';
}): string {
  return `# 角色设定
你是一位专业的面试评估专家，需要对候选人的面试表现进行全面评估。

# 面试信息
- **面试类型**: {interviewType}
- **公司**: {company}
- **岗位**: {positionName}
- **职位描述**: {jd}

# 候选人简历
{resumeContent}

# 面试问答记录
{qaList}
{qualityMetrics}

# 评估任务

请根据候选人在面试中的表现，生成一份完整的评估报告。

## 重要评分原则

1. **严格按照回答质量评分**：
   - 回答过短（<20字）或无实质内容 → 严重扣分
   - 回答与问题无关或答非所问 → 严重扣分
   - 回答空洞、缺乏细节和实例 → 大幅扣分
   - 回答有逻辑、有深度、有实例 → 正常给分

2. **与标准答案对比**：
   - 必须对比用户回答与标准答案的差距
   - 遗漏关键点要扣分
   - 理解错误要严重扣分

3. **综合评分要真实反映水平**：
   - 无回答或全部回答过短 → 0-40分（需提升）
   - 回答不充分、质量差 → 40-60分（需提升）
   - 回答基本合格但有明显不足 → 60-74分（中等）
   - 回答良好、基本符合要求 → 75-89分（良好）
   - 回答优秀、超出预期 → 90-100分（优秀）

## 评估维度

${
  context.interviewType === 'special'
    ? `### 专项面试评估维度（技术面试）
1. **技术能力** (0-100)：技术深度、知识广度、问题解决能力
2. **项目经验** (0-100)：项目复杂度、个人贡献、成果展示
3. **问题解决** (0-100)：分析能力、思路清晰度、创新性
4. **学习能力** (0-100)：技术敏感度、学习热情、知识更新
5. **沟通表达** (0-100)：表达清晰度、逻辑性、专业术语使用`
    : `### 综合面试评估维度（行测+HR）
1. **逻辑思维** (0-100)：逻辑推理能力、问题分析能力
2. **沟通表达** (0-100)：表达清晰度、逻辑性、说服力
3. **职业素养** (0-100)：职业态度、责任心、稳定性
4. **团队协作** (0-100)：团队意识、协作能力、冲突处理
5. **抗压能力** (0-100)：压力应对、情绪管理、适应能力`
}

## 输出要求

请以 JSON 格式输出评估报告，包含以下字段：

\`\`\`json
{
  "overallScore": 85,
  "overallLevel": "优秀",
  "overallComment": "候选人表现出色，技术功底扎实...",
  "radarData": [
    {"dimension": "技术能力", "score": 88, "description": "技术深度好，知识面广"},
    {"dimension": "项目经验", "score": 85, "description": "有丰富的实战经验"},
    {"dimension": "问题解决", "score": 82, "description": "思路清晰，方案合理"},
    {"dimension": "学习能力", "score": 80, "description": "学习意愿强"},
    {"dimension": "沟通表达", "score": 83, "description": "表达清晰流畅"}
  ],
  "strengths": [
    "技术理解深入，能够讲清楚底层原理",
    "项目经验丰富，有大型项目实战",
    "问题分析透彻，思路清晰"
  ],
  "weaknesses": [
    "团队协作经验相对较少",
    "系统设计能力有待提升",
    "压力应对策略需要加强"
  ],
  "improvements": [
    {
      "category": "技术深度",
      "suggestion": "建议深入学习性能优化和架构设计",
      "priority": "high"
    },
    {
      "category": "软技能",
      "suggestion": "加强团队协作和沟通能力的培养",
      "priority": "medium"
    }
  ],
  "fluencyScore": 85,
  "logicScore": 82,
  "professionalScore": 88
}
\`\`\`

## 评分标准

- **90-100分（优秀）**：表现出色，远超岗位要求
- **75-89分（良好）**：表现良好，符合岗位要求
- **60-74分（中等）**：基本符合要求，但有明显不足
- **60分以下（需提升）**：不符合岗位要求，需要提升

## 注意事项

1. **评分必须严格客观**：不要给没有充分回答的候选人高分
2. **回答长度是重要参考**：过短的回答（<20字）说明候选人没有认真思考
3. **必须对比标准答案**：评估回答是否包含关键要点
4. **优劣势要具体**：避免空泛，要基于实际回答内容
5. **改进建议要针对性强**：指出具体哪些方面需要提升
6. **雷达图要真实反映水平**：不要给无效回答虚高的分数
7. **综合评价要客观公正**：既要肯定优点，更要指出明显不足
8. **低质量回答要给低分**：无回答/答非所问/过短回答 → 必须低于60分

请严格按照 JSON 格式输出，不要包含其他文字。`;
}
