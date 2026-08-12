export function validateScorePayload(gameId: string, score: number): { valid: boolean; reason?: string } {
  if (typeof score !== "number" || Number.isNaN(score) || !Number.isInteger(score) || score < 0) {
    return { valid: false, reason: "점수는 0 이상의 정수이어야 합니다." };
  }

  switch (gameId) {
    case "reaction-time":
      if (score < 50 || score > 10000) {
        return { valid: false, reason: "유효하지 않은 반응속도 기록입니다 (50ms~10,000ms)." };
      }
      break;
    case "memory-test":
      if (score < 1 || score > 50) {
        return { valid: false, reason: "유효하지 않은 기억력 레벨 기록입니다 (1~50)." };
      }
      break;
    case "aim-test":
      if (score < 500 || score > 60000) {
        return { valid: false, reason: "유효하지 않은 에임 테스트 기록입니다." };
      }
      break;
    default:
      if (score > 1000000) {
        return { valid: false, reason: "허용 범위를 초과한 점수입니다." };
      }
      break;
  }

  return { valid: true };
}
