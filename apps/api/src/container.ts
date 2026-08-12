import {
  D1UserRepository,
  D1SessionRepository,
  D1ScoreRepository,
  D1PersonalizationRepository,
  D1AccountMergeRepository,
} from "@gamemoa/db";
import {
  ScoreUseCases,
  PersonalizationUseCases,
  IdentityUseCases,
  AccountMergeUseCases,
  type UserRepository,
  type SessionRepository,
  type ScoreRepository,
  type PersonalizationRepository,
  type AccountMergeRepository,
} from "@gamemoa/core";
import type { D1Database } from "@cloudflare/workers-types";

export interface AppContainer {
  userRepo: UserRepository;
  sessionRepo: SessionRepository;
  scoreRepo: ScoreRepository;
  personalizationRepo: PersonalizationRepository;
  accountMergeRepo: AccountMergeRepository;
  scoreUseCases: ScoreUseCases;
  personalizationUseCases: PersonalizationUseCases;
  identityUseCases: IdentityUseCases;
  accountMergeUseCases: AccountMergeUseCases;
}

export function createContainer(db: D1Database): AppContainer {
  const userRepo = new D1UserRepository(db);
  const sessionRepo = new D1SessionRepository(db);
  const scoreRepo = new D1ScoreRepository(db);
  const personalizationRepo = new D1PersonalizationRepository(db);
  const accountMergeRepo = new D1AccountMergeRepository(db);

  const scoreUseCases = new ScoreUseCases(scoreRepo);
  const personalizationUseCases = new PersonalizationUseCases(personalizationRepo);
  const identityUseCases = new IdentityUseCases(userRepo);
  const accountMergeUseCases = new AccountMergeUseCases(accountMergeRepo, userRepo);

  return {
    userRepo,
    sessionRepo,
    scoreRepo,
    personalizationRepo,
    accountMergeRepo,
    scoreUseCases,
    personalizationUseCases,
    identityUseCases,
    accountMergeUseCases,
  };
}
