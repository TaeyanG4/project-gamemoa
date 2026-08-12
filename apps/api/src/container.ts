import { D1UserRepository, D1SessionRepository, D1ScoreRepository } from "@gamemoa/db";
import {
  ScoreUseCases,
  type UserRepository,
  type SessionRepository,
  type ScoreRepository,
} from "@gamemoa/core";
import type { D1Database } from "@cloudflare/workers-types";

export interface AppContainer {
  userRepo: UserRepository;
  sessionRepo: SessionRepository;
  scoreRepo: ScoreRepository;
  scoreUseCases: ScoreUseCases;
}

export function createContainer(db: D1Database): AppContainer {
  const userRepo = new D1UserRepository(db);
  const sessionRepo = new D1SessionRepository(db);
  const scoreRepo = new D1ScoreRepository(db);
  const scoreUseCases = new ScoreUseCases(scoreRepo);

  return {
    userRepo,
    sessionRepo,
    scoreRepo,
    scoreUseCases,
  };
}
