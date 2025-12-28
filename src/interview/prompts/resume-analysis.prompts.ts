export const RESUME_ANALYSIS_SYSTEM_MESSAGE = (position: string): string => {
  return `你是一个资深的 ${position} 面试官，有 15 年的招聘经验。你能快速从简历中识别候选人的核心能力。`;
};

export const RESUME_ANALYSIS_PROMPT = `
你已经拥有以下信息，要求你进行分析：

## 简历内容

{resume_content}

## 岗位要求

{job_description}

## 分析要求

1. 提取候选人的：
   - 工作年限
   - 主要技能
   - 最近工作经历
   - 教育背景

2. 评估匹配度（0-100）

3. 识别优势和不足

## 输出格式（JSON）

{{
  "years_of_experience": 数字,
  "skills": ["技能1", "技能2", ...],
  "recent_position": "最近的职位",
  "education": "学历",
  "match_score": 数字（0-100），
  "strengths": ["优势1", "优势2"],
  "gaps": ["缺陷1", "缺陷2"],
  "summary": "1-2 句总结"
}}
`;

export const CONVERSATION_CONTINUATION_PROMPT = `基于以下对话历史，请回答最后一个问题。

对话历史：
{history}

请给出清晰、有逻辑的回答。`;
