/**
 * Time helpers. Everything here is deliberately local-timezone based: a day is
 * the user's day, not UTC's. Getting this wrong puts a 23:30 event on tomorrow.
 */

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export function startOfDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** "2026-08-04" in local time. */
export function dayKey(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** "2026-08" in local time. */
export function monthKey(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

/**
 * ISO-8601 week key, e.g. "2026-W32". ISO weeks start on Monday and belong to
 * the year containing their Thursday, which is why this cannot be a simple
 * divide-by-seven — around New Year the naive version is off by a whole year.
 */
export function isoWeekKey(ts: number): string {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  // Shift to the Thursday of this ISO week (getDay: Sun=0 → treat as 7).
  const dayOfWeek = d.getDay() || 7;
  d.setDate(d.getDate() + 4 - dayOfWeek);
  const isoYear = d.getFullYear();
  const jan1 = new Date(isoYear, 0, 1);
  const week = Math.ceil(((d.getTime() - jan1.getTime()) / DAY + 1) / 7);
  return `${isoYear}-W${pad(week)}`;
}

/** Local midnight of the Monday starting the ISO week containing `ts`. */
export function startOfIsoWeek(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  const dayOfWeek = d.getDay() || 7;
  d.setDate(d.getDate() - (dayOfWeek - 1));
  return d.getTime();
}

export function startOfMonth(ts: number): number {
  const d = new Date(ts);
  return new Date(d.getFullYear(), d.getMonth(), 1).getTime();
}

/**
 * Epoch millis → the value an `<input type="datetime-local">` expects.
 * Must be local wall-clock; `toISOString()` here is the classic bug that
 * silently shifts every edited timestamp by the UTC offset.
 */
export function toDatetimeLocal(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Inverse of `toDatetimeLocal`. Returns null for an unparseable value. */
export function fromDatetimeLocal(value: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(value);
  if (!match) return null;
  const [, year, month, day, hour, minute, second] = match;
  // Constructed via local-time components on purpose — `new Date(string)`
  // parses some of these as UTC.
  const d = new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    Number(second ?? 0),
    0,
  );
  const ts = d.getTime();
  return Number.isNaN(ts) ? null : ts;
}

/** "just now", "12m ago", "3h ago", "2d ago", then a date. */
export function formatRelative(ts: number, now: number = Date.now()): string {
  const diff = now - ts;
  if (diff < 0) return "scheduled";
  if (diff < 45_000) return "just now";
  if (diff < HOUR) return `${Math.round(diff / MINUTE)}m ago`;
  if (diff < DAY) return `${Math.round(diff / HOUR)}h ago`;

  const days = Math.round((startOfDay(now) - startOfDay(ts)) / DAY);
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d ago`;
  return new Date(ts).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

export function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}
