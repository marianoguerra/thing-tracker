import { useEffect, useState } from "react";

import { useLocalStorageState } from "@/hooks/useLocalStorageState";
import {
  ensurePersistentStorage,
  formatBytes,
  storageStatus,
  type StorageStatus,
} from "@/lib/persistence";

const DISMISSED_KEY = "tt.storage.dismissed.v1";

/**
 * Explains, once, that data lives only on this device — and quietly asks the
 * browser for persistent storage while it does.
 *
 * The request is deliberately made here rather than at startup: Chromium grants
 * persistence on engagement, so asking after the user has done something has a
 * far better chance of succeeding than asking on cold boot.
 */
export function StorageBanner() {
  const [status, setStatus] = useState<StorageStatus | null>(null);
  const [dismissed, setDismissed] = useLocalStorageState<boolean>(DISMISSED_KEY, false);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      await ensurePersistentStorage();
      const next = await storageStatus();
      if (!cancelled) setStatus(next);
    };
    // One interaction is enough to count as engagement.
    const onInteract = () => {
      void run();
      window.removeEventListener("pointerdown", onInteract);
    };
    window.addEventListener("pointerdown", onInteract, { once: true });
    return () => {
      cancelled = true;
      window.removeEventListener("pointerdown", onInteract);
    };
  }, []);

  if (dismissed || !status?.supported || status.persisted) return null;

  return (
    <div className="border-border/60 bg-muted/40 mx-4 mt-3 rounded-lg border p-3 text-xs">
      <p className="text-foreground font-medium">Your data is only on this device</p>
      <p className="text-muted-foreground mt-0.5">
        The browser hasn&apos;t marked this app&apos;s storage as persistent, so it could be cleared
        if space runs low. Export a backup from Manage → Data now and again.
        {status.usageBytes !== undefined && ` Currently using ${formatBytes(status.usageBytes)}.`}
      </p>
      <button
        type="button"
        className="text-muted-foreground mt-1.5 underline underline-offset-2"
        onClick={() => setDismissed(true)}
      >
        Got it
      </button>
    </div>
  );
}
