-- Migration 0017: User-preferred UI locale (i18n foundation)
--
-- NULL means "no saved preference yet" — never defaulted to a specific locale at the DB layer.
-- Resolution order (authenticated user's saved locale -> guest localStorage -> browser
-- navigator.languages -> ko-KR) lives entirely in application code
-- (apps/web/app/features/i18n), never in SQL.

ALTER TABLE users ADD COLUMN locale TEXT;
