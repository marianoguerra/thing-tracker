import { describe, expect, it } from "vite-plus/test";

import {
  dayKey,
  formatRelative,
  fromDatetimeLocal,
  isoWeekKey,
  monthKey,
  startOfDay,
  startOfIsoWeek,
  toDatetimeLocal,
} from "./time";

/**
 * Everything here is about the local timezone. Run under `TZ=...` to exercise
 * offsets other than the machine's; the assertions are written to hold in any
 * zone rather than pinning to one.
 */
describe("datetime-local round trip", () => {
  it("survives a round trip", () => {
    const original = new Date(2026, 7, 4, 17, 42, 0, 0).getTime();
    expect(fromDatetimeLocal(toDatetimeLocal(original))).toBe(original);
  });

  it("interprets the value as local wall-clock, not UTC", () => {
    // The classic bug: using toISOString()/new Date(string) here shifts every
    // edited timestamp by the UTC offset, silently moving entries between days.
    const parsed = fromDatetimeLocal("2026-08-04T17:42");
    const d = new Date(parsed!);
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(7);
    expect(d.getDate()).toBe(4);
    expect(d.getHours()).toBe(17);
    expect(d.getMinutes()).toBe(42);
  });

  it("round-trips across a spring-forward boundary", () => {
    // 30 March 2026 is a DST transition in much of Europe.
    for (const hour of [0, 1, 2, 3, 12, 23]) {
      const ts = new Date(2026, 2, 30, hour, 30).getTime();
      expect(fromDatetimeLocal(toDatetimeLocal(ts))).toBe(ts);
    }
  });

  it("rejects nonsense", () => {
    expect(fromDatetimeLocal("")).toBeNull();
    expect(fromDatetimeLocal("not a date")).toBeNull();
    expect(fromDatetimeLocal("2026-08-04")).toBeNull();
  });
});

describe("bucket keys", () => {
  it("keeps a late-evening entry on its own local day", () => {
    // A 23:30 event drifting to tomorrow is the single most visible symptom of
    // doing any of this in UTC.
    const late = new Date(2026, 7, 4, 23, 30).getTime();
    expect(dayKey(late)).toBe("2026-08-04");
    expect(dayKey(new Date(2026, 7, 4, 0, 1).getTime())).toBe("2026-08-04");
    expect(dayKey(new Date(2026, 7, 5, 0, 1).getTime())).toBe("2026-08-05");
  });

  it("puts a whole local day in one bucket, DST or not", () => {
    const transition = new Date(2026, 2, 30);
    const keys = new Set<string>();
    for (let hour = 0; hour < 24; hour++) {
      keys.add(dayKey(new Date(2026, 2, 30, hour, 15).getTime()));
    }
    expect(keys.size).toBe(1);
    expect([...keys][0]).toBe(dayKey(transition.getTime()));
  });

  it("starts ISO weeks on Monday", () => {
    // 2026-08-04 is a Tuesday.
    const tuesday = new Date(2026, 7, 4, 12).getTime();
    const monday = new Date(startOfIsoWeek(tuesday));
    expect(monday.getDay()).toBe(1);
    expect(monday.getDate()).toBe(3);
  });

  it("assigns a year-boundary week to the year holding its Thursday", () => {
    // 1 Jan 2027 is a Friday, so it belongs to ISO week 53 of 2026 — the case
    // a naive divide-by-seven gets wrong by a whole year.
    expect(isoWeekKey(new Date(2027, 0, 1, 12).getTime())).toBe("2026-W53");
    expect(isoWeekKey(new Date(2026, 11, 31, 12).getTime())).toBe("2026-W53");
  });

  it("groups a month by local calendar month", () => {
    expect(monthKey(new Date(2026, 7, 1, 0, 5).getTime())).toBe("2026-08");
    expect(monthKey(new Date(2026, 7, 31, 23, 55).getTime())).toBe("2026-08");
    expect(monthKey(new Date(2026, 8, 1, 0, 5).getTime())).toBe("2026-09");
  });

  it("startOfDay lands on local midnight", () => {
    const d = new Date(startOfDay(new Date(2026, 7, 4, 17, 42).getTime()));
    expect([d.getHours(), d.getMinutes(), d.getSeconds()]).toEqual([0, 0, 0]);
  });
});

describe("formatRelative", () => {
  const now = new Date(2026, 7, 4, 12, 0).getTime();

  it("describes recent times in the units people use", () => {
    expect(formatRelative(now - 10_000, now)).toBe("just now");
    expect(formatRelative(now - 12 * 60_000, now)).toBe("12m ago");
    expect(formatRelative(now - 3 * 3_600_000, now)).toBe("3h ago");
  });

  it("counts calendar days, not 24-hour blocks", () => {
    // 23:00 yesterday is "yesterday" even though it is only 13 hours ago.
    const yesterdayLate = new Date(2026, 7, 3, 23, 0).getTime();
    expect(formatRelative(yesterdayLate, now)).toBe("13h ago");
    expect(formatRelative(new Date(2026, 7, 3, 9, 0).getTime(), now)).toBe("yesterday");
  });

  it("does not claim a future time is in the past", () => {
    expect(formatRelative(now + 60_000, now)).toBe("scheduled");
  });
});
