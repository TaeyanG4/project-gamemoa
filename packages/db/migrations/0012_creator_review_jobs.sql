-- Migration 0012: Creator Featured Review Jobs (Phase E2A)
-- Featured 심사/6시간 자동 재심사 상태 머신. 크리에이터 프로필 상태와 별도로 유지되며,
-- 프로필의 featured_status(FEATURED 여부)만 프레젠테이션 플래그로 사용합니다.

CREATE TABLE IF NOT EXISTS creator_review_jobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  creator_platform_account_id INTEGER NOT NULL REFERENCES creator_platform_accounts(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'AUTO_REVIEW_PENDING',
  -- 'AUTO_REVIEW_PENDING' (진행), 'FAILED_RETRYABLE' (재시도 가능 실패),
  -- 'FEATURED' / 'NOT_ELIGIBLE' / 'MANUAL_REVIEW' (종결)
  initial_audience INTEGER,
  initial_channel_created_at TEXT,
  next_check_at TEXT NOT NULL,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  completed_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_creator_review_jobs_account ON creator_review_jobs(creator_platform_account_id);
CREATE INDEX IF NOT EXISTS idx_creator_review_jobs_due ON creator_review_jobs(status, next_check_at);