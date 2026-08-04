import type { TrackedEvent } from "@/db/schema";
import { dayKey, isoWeekKey, monthKey, startOfDay, startOfIsoWeek, startOfMonth } from "@/lib/time";

export const GRANULARITIES = ["day", "week", "month"] as const;
export type Granularity = (typeof GRANULARITIES)[number];

export type BucketChip = {
  thingId: string;
  count: number;
  /** Most recent event in this bucket for this thing — drives "last at". */
  lastAt: number;
};

export type Bucket = {
  key: string;
  /** Local-midnight start of the bucket, for labelling and range queries. */
  start: number;
  chips: BucketChip[];
  total: number;
};

const KEY_FN: Record<Granularity, (ts: number) => string> = {
  day: dayKey,
  week: isoWeekKey,
  month: monthKey,
};

const START_FN: Record<Granularity, (ts: number) => number> = {
  day: startOfDay,
  week: startOfIsoWeek,
  month: startOfMonth,
};

/**
 * Groups events into local day / ISO week / month buckets, and within each
 * bucket counts them per thing.
 *
 * Deliberately a pure function over an already-fetched array rather than a
 * database aggregation: the bucket key is derived (and timezone-dependent),
 * the window moves as the user scrolls, and getting day boundaries right is
 * exactly the kind of thing that needs to be testable without a browser.
 *
 * Buckets are ordered newest-first. Events are bucketed by `actualAt` — when
 * the thing happened — not by when it was typed in.
 */
export function bucketEvents(events: readonly TrackedEvent[], granularity: Granularity): Bucket[] {
  const keyOf = KEY_FN[granularity];
  const startOf = START_FN[granularity];

  const buckets = new Map<string, { start: number; counts: Map<string, BucketChip> }>();

  for (const event of events) {
    const key = keyOf(event.actualAt);
    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = { start: startOf(event.actualAt), counts: new Map() };
      buckets.set(key, bucket);
    }
    const chip = bucket.counts.get(event.thingId);
    if (chip) {
      chip.count += 1;
      if (event.actualAt > chip.lastAt) chip.lastAt = event.actualAt;
    } else {
      bucket.counts.set(event.thingId, {
        thingId: event.thingId,
        count: 1,
        lastAt: event.actualAt,
      });
    }
  }

  return [...buckets.entries()]
    .map(([key, { start, counts }]) => {
      const chips = [...counts.values()].sort(
        (a, b) => b.count - a.count || b.lastAt - a.lastAt || a.thingId.localeCompare(b.thingId),
      );
      return {
        key,
        start,
        chips,
        total: chips.reduce((sum, chip) => sum + chip.count, 0),
      };
    })
    .sort((a, b) => b.start - a.start);
}

export type BucketOrGap =
  | { kind: "bucket"; bucket: Bucket }
  | { kind: "gap"; days: number; from: number; to: number };

const DAY_MS = 86_400_000;

/**
 * Inserts gap markers between non-adjacent day buckets.
 *
 * Rendering every empty day would bury a month of real entries under blank
 * rows; dropping them silently would make a two-week break look like a single
 * day's pause. A collapsed "N quiet days" marker keeps the gap legible without
 * spending the vertical space.
 */
export function withGaps(buckets: readonly Bucket[]): BucketOrGap[] {
  const out: BucketOrGap[] = [];
  for (const [index, bucket] of buckets.entries()) {
    out.push({ kind: "bucket", bucket });
    const next = buckets[index + 1];
    if (!next) continue;
    // Calendar days apart, using midday to sidestep DST making a day 23h or 25h.
    const days = Math.round((midday(bucket.start) - midday(next.start)) / DAY_MS) - 1;
    if (days > 0) out.push({ kind: "gap", days, from: next.start, to: bucket.start });
  }
  return out;
}

function midday(ts: number): number {
  const d = new Date(ts);
  d.setHours(12, 0, 0, 0);
  return d.getTime();
}
