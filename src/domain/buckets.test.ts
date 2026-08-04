import { describe, expect, it } from "vite-plus/test";

import { newEvent, type TrackedEvent } from "@/db/schema";
import { bucketEvents, withGaps } from "./buckets";

let seq = 0;
function at(date: Date, thingId: string): TrackedEvent {
  seq += 1;
  return newEvent({ id: `e${String(seq)}`, thingId, recordedAt: date.getTime() });
}

describe("bucketEvents", () => {
  it("groups by local day and counts per thing", () => {
    const events = [
      at(new Date(2026, 7, 4, 8), "water"),
      at(new Date(2026, 7, 4, 12), "water"),
      at(new Date(2026, 7, 4, 18), "coffee"),
      at(new Date(2026, 7, 3, 9), "water"),
    ];
    const buckets = bucketEvents(events, "day");

    expect(buckets.map((b) => b.key)).toEqual(["2026-08-04", "2026-08-03"]);
    expect(buckets[0]?.total).toBe(3);
    // Chips sort by count, so the busiest thing leads the row.
    expect(buckets[0]?.chips[0]).toMatchObject({ thingId: "water", count: 2 });
    expect(buckets[0]?.chips[1]).toMatchObject({ thingId: "coffee", count: 1 });
  });

  it("keeps a 23:30 entry out of the following day", () => {
    const buckets = bucketEvents(
      [at(new Date(2026, 7, 4, 23, 30), "x"), at(new Date(2026, 7, 5, 0, 30), "x")],
      "day",
    );
    expect(buckets).toHaveLength(2);
    expect(buckets.map((b) => b.key)).toEqual(["2026-08-05", "2026-08-04"]);
  });

  it("puts a DST-transition day's 24 hours in one bucket", () => {
    const events = Array.from({ length: 24 }, (_, hour) =>
      at(new Date(2026, 2, 30, hour, 15), "x"),
    );
    const buckets = bucketEvents(events, "day");
    expect(buckets).toHaveLength(1);
    expect(buckets[0]?.total).toBe(24);
  });

  it("buckets by actualAt rather than recordedAt", () => {
    // A backdated entry belongs to the day it happened, not the day it was
    // typed in — otherwise correcting a time moves nothing on screen.
    const event = newEvent({
      id: "back",
      thingId: "x",
      recordedAt: new Date(2026, 7, 4, 10).getTime(),
      actualAt: new Date(2026, 6, 1, 10).getTime(),
    });
    expect(bucketEvents([event], "day")[0]?.key).toBe("2026-07-01");
  });

  it("groups by ISO week and by month", () => {
    const events = [
      at(new Date(2026, 7, 3, 10), "x"), // Mon
      at(new Date(2026, 7, 9, 10), "x"), // Sun, same ISO week
      at(new Date(2026, 7, 10, 10), "x"), // Mon, next week
    ];
    expect(bucketEvents(events, "week")).toHaveLength(2);
    expect(bucketEvents(events, "month")).toHaveLength(1);
    expect(bucketEvents(events, "month")[0]?.total).toBe(3);
  });

  it("returns nothing for no events", () => {
    expect(bucketEvents([], "day")).toEqual([]);
  });
});

describe("withGaps", () => {
  it("marks runs of quiet days between entries", () => {
    const rows = withGaps(
      bucketEvents([at(new Date(2026, 7, 4, 9), "x"), at(new Date(2026, 7, 1, 9), "x")], "day"),
    );
    expect(rows.map((r) => r.kind)).toEqual(["bucket", "gap", "bucket"]);
    // 2nd and 3rd are quiet; the 1st and 4th have entries.
    expect(rows[1]).toMatchObject({ kind: "gap", days: 2 });
  });

  it("does not invent a gap between consecutive days", () => {
    const rows = withGaps(
      bucketEvents([at(new Date(2026, 7, 4, 9), "x"), at(new Date(2026, 7, 3, 9), "x")], "day"),
    );
    expect(rows.every((r) => r.kind === "bucket")).toBe(true);
  });

  it("counts a gap in calendar days across a DST change", () => {
    // Measured at midday precisely so a 23- or 25-hour day can't round wrong.
    const rows = withGaps(
      bucketEvents([at(new Date(2026, 3, 1, 9), "x"), at(new Date(2026, 2, 28, 9), "x")], "day"),
    );
    expect(rows[1]).toMatchObject({ kind: "gap", days: 3 });
  });
});
