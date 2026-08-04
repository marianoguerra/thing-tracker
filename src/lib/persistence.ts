export type StorageStatus = {
  persisted: boolean;
  supported: boolean;
  usageBytes?: number;
  quotaBytes?: number;
};

/**
 * Asks the browser not to evict this origin's IndexedDB.
 *
 * Worth caring about: there is no server, so eviction is permanent data loss.
 * Chromium grants this based on engagement heuristics, which is why it should
 * be called after the user has actually interacted rather than on cold boot —
 * a boot-time call usually just returns false and burns the opportunity.
 */
export async function ensurePersistentStorage(): Promise<boolean> {
  if (!navigator.storage?.persist) return false;
  try {
    if (await navigator.storage.persisted()) return true;
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}

export async function storageStatus(): Promise<StorageStatus> {
  if (!navigator.storage?.estimate) return { persisted: false, supported: false };
  try {
    const [persisted, estimate] = await Promise.all([
      navigator.storage.persisted?.() ?? Promise.resolve(false),
      navigator.storage.estimate(),
    ]);
    return {
      persisted,
      supported: true,
      usageBytes: estimate.usage,
      quotaBytes: estimate.quota,
    };
  } catch {
    return { persisted: false, supported: false };
  }
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${String(bytes)} B`;
  const units = ["kB", "MB", "GB"];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value < 10 ? value.toFixed(1) : String(Math.round(value))} ${units[unit]!}`;
}
