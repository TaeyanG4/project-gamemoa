export interface ScoreStrategy {
  readonly order: "higher-is-better" | "lower-is-better";
  normalize(score: number): number;
  format(score: number): string;
}
