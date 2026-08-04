export const DURATION_UNITS = ["seconds", "minutes", "hours", "days"] as const;
export type DurationUnit = (typeof DURATION_UNITS)[number];

export const UNIT_MS: Record<DurationUnit, number> = {
  seconds: 1000,
  minutes: 60_000,
  hours: 3_600_000,
  days: 86_400_000,
};

export const UNIT_SHORT: Record<DurationUnit, string> = {
  seconds: "s",
  minutes: "m",
  hours: "h",
  days: "d",
};

/** A day is the largest unit; anything longer is almost certainly a mistake. */
export const MAX_DURATION_MS = 90 * 86_400_000;

export function toMs(value: number, unit: DurationUnit): number {
  return Math.round(value * UNIT_MS[unit]);
}

export function fromMs(ms: number, unit: DurationUnit): number {
  return ms / UNIT_MS[unit];
}

/**
 * Rounds to at most two decimals, then drops trailing zeros — "1.5h" reads
 * better than "1.50h", and "90m" should not become "90.0000001m" after a
 * unit switch.
 */
export function formatValue(value: number): string {
  return String(Math.round(value * 100) / 100);
}

/**
 * Human-readable duration, using the largest unit that stays legible.
 *
 * Hours are shown as "1h 30m" rather than "1.5h" because the mixed form is
 * what people actually say, and a bare decimal hour is easy to misread.
 */
export function formatDuration(ms: number): string {
  if (ms <= 0) return "0m";

  const days = Math.floor(ms / UNIT_MS.days);
  const hours = Math.floor((ms % UNIT_MS.days) / UNIT_MS.hours);
  const minutes = Math.floor((ms % UNIT_MS.hours) / UNIT_MS.minutes);
  const seconds = Math.round((ms % UNIT_MS.minutes) / UNIT_MS.seconds);

  if (days > 0) return hours > 0 ? `${String(days)}d ${String(hours)}h` : `${String(days)}d`;
  if (hours > 0) return minutes > 0 ? `${String(hours)}h ${String(minutes)}m` : `${String(hours)}h`;
  if (minutes > 0)
    return seconds > 0 && minutes < 5
      ? `${String(minutes)}m ${String(seconds)}s`
      : `${String(minutes)}m`;
  return `${String(seconds)}s`;
}

/** The unit a duration is most naturally expressed in. */
export function naturalUnit(ms: number): DurationUnit {
  if (ms >= UNIT_MS.days) return "days";
  if (ms >= UNIT_MS.hours) return "hours";
  if (ms >= UNIT_MS.minutes) return "minutes";
  return "seconds";
}

/**
 * Step sizes offered as +/- chips, in minutes.
 *
 * Fixed minute steps regardless of the display unit: "+15 minutes" is a real
 * quantity people think in, whereas "+15" of whatever unit happens to be
 * selected would mean 15 days on a sleep tracker.
 */
export const STEP_MINUTES = [1, 5, 10, 15, 30, 60] as const;

export function clampDuration(ms: number): number {
  return Math.min(Math.max(0, Math.round(ms)), MAX_DURATION_MS);
}

/**
 * The durations this thing is most often logged with, most-used first.
 *
 * This is what makes repeat logging one tap: most durations repeat exactly
 * (a 30-minute walk, an 8-hour night), so the shortlist usually already
 * contains the answer.
 */
export function commonDurations(
  durations: readonly number[],
  limit = 6,
): { ms: number; count: number }[] {
  const counts = new Map<number, number>();
  for (const ms of durations) {
    if (ms <= 0) continue;
    counts.set(ms, (counts.get(ms) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([ms, count]) => ({ ms, count }))
    .sort((a, b) => b.count - a.count || a.ms - b.ms)
    .slice(0, limit);
}
