/**
 * 仅押题部分的格式说明
 */
export const FORMAT_INSTRUCTIONS_QUESTIONS_ONLY = `
请严格按照以下JSON格式返回结果：

{
  "questions": [
    {
      "question": "问题内容（清晰、具体）",
      "answer": "参考答案（结合候选人背景，500-1000字）",
      "category": "technical | project | problem-solving | soft-skill",
      "difficulty": "easy | medium | hard",
      "tips": "回答要点：1. xxx 2. xxx 3. xxx",
      "keywords": ["关键词1", "关键词2"],
      "reasoning": "考察目的和判断依据"
    }
  ],
  "summary": "综合评估（候选人优势、薄弱点、面试策略，200-300字）"
}

⚠️ 注意事项：
1. 确保返回有效的JSON格式，不要包含注释
2. questions数组长度为3-5
3. 每个答案200-300字
4. summary 150-200字
5. 不要包含任何JSON之外的文本
6. **重要**：JSON字符串中必须正确转义特殊字符：
   - 换行使用 \\n（不要直接换行）
   - 引号使用 \\"
   - 反斜杠使用 \\\\
   - 制表符使用 \\t
7. 所有文本内容都应该是单行字符串，段落之间用 \\n 分隔
`;

/**
 * 仅匹配度分析的格式说明
 */
export const FORMAT_INSTRUCTIONS_ANALYSIS_ONLY = `
请严格按照以下JSON格式返回结果：

{
  "matchScore": 85,
  "matchLevel": "良好",
  "matchedSkills": [
    {
      "skill": "Vue.js",
      "matched": true,
      "proficiency": "熟练掌握，有2年项目经验"
    }
  ],
  "missingSkills": ["TypeScript", "Docker"],
  "knowledgeGaps": [
    "需要系统学习TypeScript类型系统",
    "缺少大规模系统架构设计经验"
  ],
  "learningPriorities": [
    {
      "topic": "TypeScript",
      "priority": "high",
      "reason": "JD明确要求"
    }
  ],
  "radarData": [
    {
      "dimension": "技术能力",
      "score": 85,
      "description": "掌握主流前端技术栈"
    },
    {
      "dimension": "项目经验",
      "score": 80,
      "description": "有多个项目实战经验"
    },
    {
      "dimension": "问题解决",
      "score": 75,
      "description": "具备独立解决问题的能力"
    },
    {
      "dimension": "软技能",
      "score": 78,
      "description": "良好的团队协作和沟通能力"
    }
  ],
  "strengths": [
    "具有3年Vue.js开发经验，参与过多个项目",
    "有完整的前端工程化实践经验"
  ],
  "weaknesses": [
    "TypeScript使用经验较少",
    "缺少大型项目的性能优化经验"
  ],
  "interviewTips": [
    "重点准备Vue3新特性",
    "准备2-3个项目案例"
  ]
}

⚠️ 注意事项：
1. 确保返回有效的JSON格式，不要包含注释
2. radarData至少包含4个维度
3. 所有评分都在0-100之间
4. 不要包含任何JSON之外的文本
5. **重要**：JSON字符串中必须正确转义特殊字符：
   - 换行使用 \\n（不要直接换行）
   - 引号使用 \\"
   - 反斜杠使用 \\\\
6. 所有文本内容都应该是单行字符串
`;
