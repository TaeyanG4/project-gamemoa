export interface GameResult {
  readonly gameId: string;
  readonly sessionId: string;
  readonly score: number;
  readonly durationMs: number;
  readonly metadata?: Record<string, unknown> | undefined;
  readonly clientStartedAt: number;
  readonly clientEndedAt: number;
}

export interface GameResultValidation {
  readonly valid: boolean;
  readonly reason?: string | undefined;
}
