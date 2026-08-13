-- Migration 0014: Creator audience_count known/unknown state
--
-- Distinguishes "official API explicitly confirmed zero" from "official value never obtained"
-- for creator_platform_accounts.audience_count. Prior code defaulted a missing/unreadable
-- provider metric to 0, so historical audience_count=0 rows are ambiguous and cannot be
-- trusted as a real official zero. Safety over preserving a possibly-incorrect zero:
--
--   audience_count_known = 0 (UNKNOWN) → API/domain audienceCount is surfaced as null
--   audience_count_known = 1 (KNOWN)   → audience_count is a real official value (incl. 0)
--
-- A stored positive audience_count can only have come from a genuine official API response
-- (the old code path had no other way to produce a positive number), so it is safely
-- backfilled as KNOWN. Every other existing row (null or ambiguous zero) stays UNKNOWN and
-- is repaired on the next official metric refresh (6-hour auto review / 14-day revalidation).
ALTER TABLE creator_platform_accounts ADD COLUMN audience_count_known INTEGER NOT NULL DEFAULT 0;

UPDATE creator_platform_accounts
SET audience_count_known = 1
WHERE audience_count IS NOT NULL AND audience_count > 0;
