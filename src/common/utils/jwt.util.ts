export function getTokenExpirationSeconds(): number {
  // 这里可以根据环境变量或业务需求动态计算过期时间
  // 为了与课程保持一致，先写死为 24 小时
  return 60 * 60 * 24;
}
