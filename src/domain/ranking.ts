import type { Thing } from "@/db/schema";

export type Usage = { thingId: string; total: number; lastAt: number };

export type UsageIndex = Map<string, Usage>;

export function indexUsage(rows: readonly Usage[]): UsageIndex {
  return new Map(rows.map((row) => [row.thingId, row]));
}

/**
 * Orders things most-used first, so the emoji you reach for most sits top-left.
 *
 * Ties break on recency and then title, which matters more than it sounds: the
 * comparator has to be total and deterministic, or two things with equal counts
 * would swap places on unrelated re-renders and move under the user's thumb.
 */
export function rankThings(things: readonly Thing[], usage: UsageIndex): Thing[] {
  return [...things].sort((a, b) => {
    const ua = usage.get(a.id);
    const ub = usage.get(b.id);
    const totalDiff = (ub?.total ?? 0) - (ua?.total ?? 0);
    if (totalDiff !== 0) return totalDiff;
    const lastDiff = (ub?.lastAt ?? 0) - (ua?.lastAt ?? 0);
    if (lastDiff !== 0) return lastDiff;
    return a.title.localeCompare(b.title) || a.id.localeCompare(b.id);
  });
}

/**
 * Applies a previously frozen order, appending anything new at the end.
 *
 * Re-sorting live would move a button while it is being tapped and cause
 * mis-taps, which destroys the muscle memory that makes one-tap recording fast.
 * The Track screen re-ranks only on mount and when the tab regains focus, and
 * uses this in between.
 */
export function applyFrozenOrder(things: readonly Thing[], order: readonly string[]): Thing[] {
  const rank = new Map(order.map((id, index) => [id, index]));
  return [...things].sort((a, b) => {
    const ra = rank.get(a.id);
    const rb = rank.get(b.id);
    if (ra !== undefined && rb !== undefined) return ra - rb;
    // Things absent from the frozen order are new since the last re-rank; they
    // go last rather than jumping to the front on their first use.
    if (ra !== undefined) return -1;
    if (rb !== undefined) return 1;
    return a.title.localeCompare(b.title) || a.id.localeCompare(b.id);
  });
}
