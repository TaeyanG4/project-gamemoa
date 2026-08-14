// Pure UTC-calendar-day "consecutive active days" streak math. No I/O — callers (the D1
// session adapter) own reading the previous state and persisting the result.

/** Returns today's date as a UTC "YYYY-MM-DD" string. */
export function todayUtcDateString(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

function previousUtcDateString(dateString: string): string {
  const asUtcMidnight = new Date(`${dateString}T00:00:00.000Z`).getTime();
  return new Date(asUtcMidnight - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export interface StreakState {
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string | null;
}

export interface StreakUpdateResult extends StreakState {
  /** false when `today` matches the already-recorded last active date — caller should skip writing. */
  changed: boolean;
}

/**
 * Given the user's previously recorded streak state and today's UTC date, returns the next
 * state. Same-day repeat visits are a no-op (`changed: false`). A visit on the day right
 * after `lastActiveDate` extends the streak; any bigger gap (or no prior activity) resets it
 * to 1 — today itself always counts as an active day once this runs.
 */
export function nextStreakState(previous: StreakState, today: string): StreakUpdateResult {
  if (previous.lastActiveDate === today) {
    return { ...previous, changed: false };
  }

  const wasConsecutive =
    previous.lastActiveDate !== null && previous.lastActiveDate === previousUtcDateString(today);
  const currentStreak = wasConsecutive ? previous.currentStreak + 1 : 1;
  const longestStreak = Math.max(previous.longestStreak, currentStreak);

  return { currentStreak, longestStreak, lastActiveDate: today, changed: true };
}
