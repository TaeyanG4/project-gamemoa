import type { SandboxGameUseCaseFailure } from "@owogg/core";

/** Shared HTTP mapping for sandbox-game use-case failures, used by both the developer-facing
 * (devGames.ts) and admin-facing (adminSandboxGames.ts) routers. One table rather than two, so a
 * new failure code can't be mapped to different statuses depending on who hit it — and because
 * these are exhaustive `Record`s, adding a code to the union makes both routers fail to compile
 * until it's handled. */
export type SandboxGameFailureStatus = 400 | 403 | 404 | 409 | 413 | 422 | 500;

export const SANDBOX_GAME_FAILURE_STATUS: Record<
  SandboxGameUseCaseFailure["code"],
  SandboxGameFailureStatus
> = {
  GAME_NOT_FOUND: 404,
  VERSION_NOT_FOUND: 404,
  SLUG_TAKEN: 409,
  INVALID_SLUG: 400,
  INVALID_TITLE: 400,
  NOT_OWNER: 403,
  BUNDLE_TOO_LARGE: 413,
  BUNDLE_EMPTY: 400,
  ALREADY_DECIDED: 409,
  REASON_REQUIRED: 400,
  NO_APPROVED_VERSION: 409,
  VERSION_NOT_PUBLISHED: 409,
  VERSION_NOT_APPROVED: 409,
  // Publishing failed on our side (storage error), not because of anything wrong with the upload.
  PUBLISH_FAILED: 500,
  // 422: the request was well-formed and authorized, but the bundle's *contents* are unacceptable.
  BUNDLE_MALFORMED: 422,
  BUNDLE_INVALID_PATH: 422,
  BUNDLE_TOO_MANY_FILES: 422,
  BUNDLE_EXTRACTED_TOO_LARGE: 422,
  BUNDLE_MISSING_ENTRY: 422,
  SUBMISSION_LIMIT_REACHED: 409,
  NOTHING_TO_WITHDRAW: 409,
  MANIFEST_MISSING: 422,
  INVALID_GENRE: 400,
  ALREADY_DELETED: 409,
};

export const SANDBOX_GAME_FAILURE_MESSAGE: Record<SandboxGameUseCaseFailure["code"], string> = {
  GAME_NOT_FOUND: "존재하지 않는 게임입니다.",
  VERSION_NOT_FOUND: "존재하지 않는 버전입니다.",
  SLUG_TAKEN: "이미 사용 중인 슬러그입니다.",
  INVALID_SLUG: "슬러그는 영문 소문자/숫자/-, 3~64자여야 합니다.",
  INVALID_TITLE: "제목은 1~60자여야 합니다.",
  NOT_OWNER: "본인이 등록한 게임만 업로드할 수 있습니다.",
  BUNDLE_TOO_LARGE: "번들 용량이 최대 허용치를 초과했습니다.",
  BUNDLE_EMPTY: "빈 파일은 업로드할 수 없습니다.",
  ALREADY_DECIDED: "이미 심사가 완료된 버전입니다.",
  REASON_REQUIRED: "사유를 입력해야 합니다.",
  NO_APPROVED_VERSION: "승인된 버전이 있어야 공개로 전환할 수 있습니다.",
  VERSION_NOT_PUBLISHED:
    "번들 배포가 완료되지 않은 버전입니다. 재배포 후 다시 시도하거나 새로 업로드하세요.",
  VERSION_NOT_APPROVED: "승인된 버전만 라이브로 지정할 수 있습니다.",
  PUBLISH_FAILED: "번들 배포에 실패했습니다. 잠시 후 재배포를 시도하세요.",
  BUNDLE_MALFORMED: "ZIP 파일을 읽을 수 없습니다. 정상적인 ZIP으로 다시 압축해 주세요.",
  BUNDLE_INVALID_PATH: "ZIP 안에 허용되지 않는 파일 경로가 있습니다(절대 경로/상위 경로 등).",
  BUNDLE_TOO_MANY_FILES: "ZIP 안의 파일 개수가 허용치를 초과했습니다.",
  BUNDLE_EXTRACTED_TOO_LARGE: "압축을 푼 전체 용량이 허용치를 초과했습니다.",
  BUNDLE_MISSING_ENTRY: "ZIP 최상위에 index.html이 없습니다.",
  SUBMISSION_LIMIT_REACHED:
    "현재 심사 중인 게임이 2개입니다. 기존 게임의 심사가 완료되거나 제출을 철회한 뒤 다시 시도해주세요.",
  NOTHING_TO_WITHDRAW: "철회할 심사 중인 제출이 없습니다.",
  MANIFEST_MISSING:
    "ZIP 최상위에 owogg.game.json이 없습니다. 자동 등록하려면 slug/title/genre가 담긴 이 파일을 포함하세요.",
  INVALID_GENRE: "genre는 비어 있지 않은 문자열이어야 합니다.",
  ALREADY_DELETED: "이미 삭제된 게임입니다.",
};
