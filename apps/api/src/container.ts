import {
  D1UserRepository,
  D1SessionRepository,
  D1ScoreRepository,
  D1PersonalizationRepository,
} from "@gamemoa/db";
import {
  ScoreUseCases,
  PersonalizationUseCases,
  type UserRepository,
  type SessionRepository,
  type ScoreRepository,
  type PersonalizationRepository,
} from "@gamemoa/core";
import type { D1Database } from "@cloudflare/workers-types";

export interface AppContainer {
  userRepo: UserRepository;
  sessionRepo: SessionRepository;
  scoreRepo: ScoreRepository;
  personalizationRepo: PersonalizationRepository;
  scoreUseCases: ScoreUseCases;
  personalizationUseCases: PersonalizationUseCases;
}

export function createContainer(db: D1Database): AppContainer {
  const userRepo = new D1UserRepository(db);
  const sessionRepo = new D1SessionRepository(db);
  const scoreRepo = new D1ScoreRepository(db);
  const personalizationRepo = new D1PersonalizationRepository(db);

  const scoreUseCases = new ScoreUseCases(scoreRepo);
  const personalizationUseCases = new PersonalizationUseCases(personalizationRepo);

  return {
    userRepo,
    sessionRepo,
    scoreRepo,
    personalizationRepo,
    scoreUseCases,
    personalizationUseCases,
  };
}
