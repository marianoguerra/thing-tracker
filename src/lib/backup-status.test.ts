import { describe, expect, it } from "vite-plus/test";

import { DAY_MS, NEVER, daysSince, isBackupDue, type BackupState } from "./backup-status";

const NOW = new Date(2026, 7, 4, 12).getTime();

const state = (partial: Partial<BackupState>): BackupState => ({
  lastAt: null,
  intervalDays: 7,
  dismissedAt: null,
  ...partial,
});

describe("isBackupDue", () => {
  it("is due when no backup has ever been made", () => {
    // The state where losing the device costs everything — and exactly the one
    // a plain "days since last backup" check would miss.
    expect(isBackupDue(state({}), NOW)).toBe(true);
  });

  it("is not due within the interval", () => {
    expect(isBackupDue(state({ lastAt: NOW - 6 * DAY_MS }), NOW)).toBe(false);
  });

  it("is due once the interval has elapsed", () => {
    expect(isBackupDue(state({ lastAt: NOW - 7 * DAY_MS }), NOW)).toBe(true);
    expect(isBackupDue(state({ lastAt: NOW - 30 * DAY_MS }), NOW)).toBe(true);
  });

  it("respects a longer interval", () => {
    const old = state({ lastAt: NOW - 8 * DAY_MS, intervalDays: 30 });
    expect(isBackupDue(old, NOW)).toBe(false);
  });

  it("stays silent when reminders are switched off, even with no backup", () => {
    expect(isBackupDue(state({ intervalDays: NEVER }), NOW)).toBe(false);
    expect(isBackupDue(state({ lastAt: NOW - 99 * DAY_MS, intervalDays: NEVER }), NOW)).toBe(false);
  });

  it("snoozes for one interval, not forever", () => {
    const overdue = { lastAt: NOW - 20 * DAY_MS };
    expect(isBackupDue(state({ ...overdue, dismissedAt: NOW - DAY_MS }), NOW)).toBe(false);
    expect(isBackupDue(state({ ...overdue, dismissedAt: NOW - 9 * DAY_MS }), NOW)).toBe(true);
  });
});

describe("daysSince", () => {
  it("counts whole elapsed days", () => {
    expect(daysSince(NOW, NOW)).toBe(0);
    expect(daysSince(NOW - 23 * 3_600_000, NOW)).toBe(0);
    expect(daysSince(NOW - DAY_MS, NOW)).toBe(1);
    expect(daysSince(NOW - 10 * DAY_MS, NOW)).toBe(10);
  });
});
