import { useCallback, useSyncExternalStore } from "react";

const KEY = "tt.backup.v1";

export const DEFAULT_INTERVAL_DAYS = 7;
export const INTERVAL_CHOICES = [1, 3, 7, 14, 30, 90] as const;
/** Reminders off entirely. */
export const NEVER = 0;

export type BackupState = {
  /** When the last successful export happened. */
  lastAt: number | null;
  /** Days between reminders; 0 disables them. */
  intervalDays: number;
  /** Covered range of the last export, so the UI can say what's already safe. */
  lastRange?: { from: number | null; to: number | null };
  /** Snoozes the reminder until the next export or interval elapses. */
  dismissedAt: number | null;
};

const DEFAULT_STATE: BackupState = {
  lastAt: null,
  intervalDays: DEFAULT_INTERVAL_DAYS,
  dismissedAt: null,
};

const listeners = new Set<() => void>();
let cache: { raw: string | null; value: BackupState } = { raw: null, value: DEFAULT_STATE };

function read(): BackupState {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {
    return DEFAULT_STATE;
  }
  // useSyncExternalStore compares snapshots by identity, so an object rebuilt
  // on every call would loop forever. Cache against the raw string instead.
  if (raw === cache.raw) return cache.value;

  let value = DEFAULT_STATE;
  if (raw !== null) {
    try {
      const parsed = JSON.parse(raw) as Partial<BackupState>;
      value = {
        lastAt: typeof parsed.lastAt === "number" ? parsed.lastAt : null,
        intervalDays:
          typeof parsed.intervalDays === "number" ? parsed.intervalDays : DEFAULT_INTERVAL_DAYS,
        lastRange: parsed.lastRange,
        dismissedAt: typeof parsed.dismissedAt === "number" ? parsed.dismissedAt : null,
      };
    } catch {
      value = DEFAULT_STATE;
    }
  }
  cache = { raw, value };
  return value;
}

function write(next: BackupState) {
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Losing the reminder schedule is not worth interrupting anyone over.
  }
  for (const listener of listeners) listener();
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  // Another tab exporting counts as backed up here too.
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

export function recordBackup(range?: { from: number | null; to: number | null }) {
  const current = read();
  write({
    ...current,
    lastAt: Date.now(),
    lastRange: range,
    // A fresh export clears the snooze; the next reminder is a whole interval
    // away, so there is nothing left to suppress.
    dismissedAt: null,
  });
}

export function setBackupInterval(days: number) {
  write({ ...read(), intervalDays: days, dismissedAt: null });
}

export function dismissBackupReminder() {
  write({ ...read(), dismissedAt: Date.now() });
}

export const DAY_MS = 86_400_000;

/**
 * Whether to nag.
 *
 * Deliberately also true when no backup has ever been made — that is precisely
 * the state where a lost device costs everything, and the one a "days since"
 * check would miss.
 */
export function isBackupDue(state: BackupState, now: number = Date.now()): boolean {
  if (state.intervalDays === NEVER) return false;
  const interval = state.intervalDays * DAY_MS;
  if (state.dismissedAt !== null && now - state.dismissedAt < interval) return false;
  if (state.lastAt === null) return true;
  return now - state.lastAt >= interval;
}

export function daysSince(ts: number, now: number = Date.now()): number {
  return Math.floor((now - ts) / DAY_MS);
}

export function useBackupState(): BackupState {
  return useSyncExternalStore(subscribe, read, () => DEFAULT_STATE);
}

export function useBackupReminder() {
  const state = useBackupState();
  const due = isBackupDue(state);
  const dismiss = useCallback(() => dismissBackupReminder(), []);
  return { state, due, dismiss };
}
