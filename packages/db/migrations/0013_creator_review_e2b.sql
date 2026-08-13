-- Migration 0013: Creator Manual Review, Audit Log & Featured Revalidation (Phase E2B)
-- E2A 취득 심사 잡과 E2B 14일 재검증 잡을 같은 잡 테이블에서 명시적으로 분리합니다.

ALTER TABLE creator_review_jobs ADD COLUMN review_type TEXT NOT NULL DEFAULT 'ACQUISITION';
ALTER TABLE creator_review_jobs ADD COLUMN review_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_creator_review_jobs_type_due
  ON creator_review_jobs(review_type, status, next_check_at);

CREATE TABLE IF NOT EXISTS creator_review_audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  creator_platform_account_id INTEGER NOT NULL,
  creator_review_job_id INTEGER,
  reviewer_user_id INTEGER NOT NULL,
  action TEXT NOT NULL,
  reason TEXT NOT NULL,
  previous_status TEXT NOT NULL,
  new_status TEXT NOT NULL,
  metric_snapshot_json TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_creator_review_audit_account
  ON creator_review_audit_log(creator_platform_account_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_creator_review_audit_job
  ON creator_review_audit_log(creator_review_job_id, reviewer_user_id, action);

-- 감사 이력은 일반 관리자 UI/API에서 수정·삭제하지 않는 append-only 원장입니다.
CREATE TRIGGER IF NOT EXISTS prevent_creator_review_audit_update
BEFORE UPDATE ON creator_review_audit_log
BEGIN
  SELECT RAISE(ABORT, 'creator review audit log is immutable');
END;

CREATE TRIGGER IF NOT EXISTS prevent_creator_review_audit_delete
BEFORE DELETE ON creator_review_audit_log
BEGIN
  SELECT RAISE(ABORT, 'creator review audit log is immutable');
END;
