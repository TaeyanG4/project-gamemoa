export type ChangelogTag = "feature" | "improvement" | "fix";

export interface ChangelogEntry {
  /** ISO date (YYYY-MM-DD). */
  date: string;
  title: string;
  description: string;
  tag: ChangelogTag;
}

/** Korean-only for now — this is fast-growing content added incrementally over time, not a fixed
 * page, so it doesn't need all 4 locales translated before it can go live (see the "translation
 * doesn't have to happen inline" policy in docs/i18n-content/GUIDE.md). Newest entry first.
 *
 * OwOGG was in active beta/build-out before this page existed, so there's no earlier history to
 * backfill — this starts from when the changelog itself launched rather than fabricating a past
 * record. */
export const CHANGELOG_ENTRIES: ChangelogEntry[] = [
  {
    date: "2026-08-14",
    title: "업데이트 로그 페이지 오픈",
    description:
      "OwOGG의 새 기능, 개선 사항, 버그 수정을 이제 이 페이지에서 확인할 수 있습니다. 베타 기간 이전의 변경 사항은 별도로 기록되지 않았습니다.",
    tag: "feature",
  },
];
