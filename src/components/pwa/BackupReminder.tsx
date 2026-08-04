import { Link } from "@tanstack/react-router";

import { daysSince, useBackupReminder } from "@/lib/backup-status";

/**
 * Nags, gently, when the only copy of the data is getting stale.
 *
 * Sits on Track rather than in Manage → Data for the same reason as the storage
 * banner: the person who most needs telling is the one who never opens the
 * settings screen.
 */
export function BackupReminder() {
  const { state, due, dismiss } = useBackupReminder();
  if (!due) return null;

  const never = state.lastAt === null;
  const days = state.lastAt === null ? 0 : daysSince(state.lastAt);

  return (
    <div className="border-border/60 bg-muted/40 mx-4 mt-3 rounded-lg border p-3 text-xs">
      <p className="text-foreground font-medium">
        {never ? "You haven't backed up yet" : "Time for a backup"}
      </p>
      <p className="text-muted-foreground mt-0.5">
        {never
          ? "Everything you've logged lives only in this browser. One file keeps it safe."
          : `Your last backup was ${days === 0 ? "today" : days === 1 ? "yesterday" : `${String(days)} days ago`}.`}
      </p>
      <div className="mt-1.5 flex gap-3">
        <Link
          to="/manage"
          search={{ tab: "data" }}
          className="text-foreground underline underline-offset-2"
        >
          Back up now
        </Link>
        <button
          type="button"
          className="text-muted-foreground underline underline-offset-2"
          onClick={dismiss}
        >
          Later
        </button>
      </div>
    </div>
  );
}
