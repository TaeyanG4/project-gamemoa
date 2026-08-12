import { D1UserRepository, D1SessionRepository, D1ScoreRepository } from "@gamemoa/db";
import type { UserRepository, SessionRepository, ScoreRepository } from "@gamemoa/core";

export interface AppContainer {
  userRepo: UserRepository;
  sessionRepo: SessionRepository;
  scoreRepo: ScoreRepository;
}

export function createContainer(db: any): AppContainer {
  return {
    userRepo: new D1UserRepository(db),
    sessionRepo: new D1SessionRepository(db),
    scoreRepo: new D1ScoreRepository(db),
  };
}
