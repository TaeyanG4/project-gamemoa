import type { GameCreatorUseCaseFailure } from "@owogg/core";

/** Shared HTTP mapping for Game Creator use-case failures, used by both the self-serve
 * (devGames.ts) and admin/operator-facing (adminGameCreators.ts) routers — same pattern as
 * sandboxGameErrors.ts. An exhaustive `Record` so a new failure code fails both routers to
 * compile until it's mapped, rather than silently falling through to a generic 500. */
export type GameCreatorFailureStatus = 403 | 404 | 409;

export const GAME_CREATOR_FAILURE_STATUS: Record<
  GameCreatorUseCaseFailure["code"],
  GameCreatorFailureStatus
> = {
  USER_NOT_FOUND: 404,
  ALREADY_ACTIVE: 409,
  NOT_A_CREATOR: 409,
  APPLICATION_NOT_ALLOWED: 403,
  APPLICATION_ALREADY_PENDING: 409,
  APPLICATION_NOT_FOUND: 404,
  APPLICATION_NOT_PENDING: 409,
};

export const GAME_CREATOR_FAILURE_MESSAGE: Record<GameCreatorUseCaseFailure["code"], string> = {
  USER_NOT_FOUND: "존재하지 않는 사용자입니다.",
  ALREADY_ACTIVE: "이미 게임 크리에이터 권한이 있습니다.",
  NOT_A_CREATOR: "게임 크리에이터로 지정된 적이 없거나 이미 해제되었습니다.",
  APPLICATION_NOT_ALLOWED: "현재 게임 크리에이터 신청이 허용되지 않습니다.",
  APPLICATION_ALREADY_PENDING: "이미 심사 대기 중인 신청이 있습니다.",
  APPLICATION_NOT_FOUND: "신청을 찾을 수 없습니다.",
  APPLICATION_NOT_PENDING: "이미 처리된 신청입니다.",
};
