/**
 * 构建专项面试的 Prompt
 */
export function buildMockInterviewPrompt(context: {
  interviewType: 'special' | 'comprehensive';
  elapsedMinutes: number;
  targetDuration: number;
  resumeContent: string;
  company?: string;
  positionName?: string;
  jd?: string;
  conversationHistory: Array<{
    role: 'interviewer' | 'candidate';
    content: string;
  }>;
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

根据上述信息，生成下一个面试问题。要求：
- 循序渐进，从基础到深入
- 考察实际能力，而不是背定义
- 简明扼要，1-2句话
- 与候选人背景相关

直接返回问题，不需要其他前缀。`;
}
