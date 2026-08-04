import { useLiveQuery } from "@tanstack/react-db";
import { DownloadIcon, UploadIcon } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useDb } from "@/db/provider";
import {
  INTERVAL_CHOICES,
  NEVER,
  daysSince,
  recordBackup,
  setBackupInterval,
  useBackupState,
} from "@/lib/backup-status";
import { saveOrShare } from "@/lib/file";
import { backupFilename, buildBackup } from "@/transfer/export";
import { cn } from "@/lib/utils";

type Props = {
  onImportText: (text: string, mode: "merge" | "replace") => void;
};

export function DataPanel({ onImportText }: Props) {
  const { db, collections } = useDb();
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<"merge" | "replace">("merge");
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: things } = useLiveQuery((q) => q.from({ thing: collections.things }));
  const { data: events } = useLiveQuery((q) => q.from({ event: collections.events }));
  const { data: groups } = useLiveQuery((q) => q.from({ group: collections.groups }));
  const backupState = useBackupState();

  async function exportBackup() {
    setBusy(true);
    try {
      const backup = await buildBackup(db, collections);
      await saveOrShare(JSON.stringify(backup, null, 2), backupFilename(backup.range));
      // Recorded only after the file is actually produced, so a failed or
      // cancelled export doesn't reset the reminder clock.
      recordBackup(backup.range);
      if (backup.attachmentsOmitted) {
        // Never let a partial backup pass as a complete one.
        toast.warning("Media not included", {
          description: "This backup was too large to include attachments.",
        });
      } else {
        toast.success("Backup ready");
      }
    } catch (error) {
      toast.error("Export failed", {
        description: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5 p-4">
      <section className="space-y-2">
        <h2 className="text-sm font-medium">On this device</h2>
        <p className="text-muted-foreground text-sm tabular-nums">
          {things.length} things · {groups.length} tags · {events.length} entries
        </p>
        <p className="text-muted-foreground text-xs">
          Everything lives in this browser. No account, no server — which also means a backup is the
          only copy that survives clearing site data.
        </p>
      </section>

      <Separator />

      <section className="space-y-2">
        <h2 className="text-sm font-medium">Backup</h2>
        <p className="text-muted-foreground text-xs">
          A single JSON file with every thing, tag and entry — for safekeeping or for analysing
          elsewhere.
        </p>
        <Button className="w-full" onClick={() => void exportBackup()} disabled={busy}>
          <DownloadIcon /> Export everything
        </Button>

        <p className="text-muted-foreground text-xs">
          {backupState.lastAt === null
            ? "No backup made yet."
            : `Last backup ${describeAge(daysSince(backupState.lastAt))}${describeRange(backupState.lastRange)}.`}
        </p>

        <div className="space-y-1.5 pt-1">
          <p className="text-muted-foreground text-xs">Remind me every</p>
          <div className="flex flex-wrap gap-1.5">
            {INTERVAL_CHOICES.map((days) => (
              <IntervalChip
                key={days}
                active={backupState.intervalDays === days}
                onClick={() => setBackupInterval(days)}
              >
                {days === 1
                  ? "day"
                  : days === 7
                    ? "week"
                    : days === 30
                      ? "month"
                      : `${String(days)}d`}
              </IntervalChip>
            ))}
            <IntervalChip
              active={backupState.intervalDays === NEVER}
              onClick={() => setBackupInterval(NEVER)}
            >
              never
            </IntervalChip>
          </div>
        </div>
      </section>

      <Separator />

      <section className="space-y-2">
        <h2 className="text-sm font-medium">Restore or import</h2>
        <p className="text-muted-foreground text-xs">
          Open a backup or a shared tag pack. You&apos;ll see exactly what changes before anything
          is written.
        </p>

        <div className="flex gap-2">
          <ModeButton active={mode === "merge"} onClick={() => setMode("merge")}>
            Merge
          </ModeButton>
          <ModeButton active={mode === "replace"} onClick={() => setMode("replace")}>
            Replace
          </ModeButton>
        </div>
        <p className="text-muted-foreground text-xs">
          {mode === "merge"
            ? "Keeps what's here and adds what's missing. Entries are never duplicated."
            : "Deletes everything on this device first. Only applies to full backups."}
        </p>

        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            void file.text().then((text) => {
              onImportText(text, mode);
            });
            // Reset so choosing the same file twice fires again.
            event.target.value = "";
          }}
        />
        <Button
          variant="outline"
          className="w-full"
          onClick={() => fileRef.current?.click()}
          disabled={busy}
        >
          <UploadIcon /> Choose a file
        </Button>
      </section>
    </div>
  );
}

function describeAge(days: number): string {
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  return `${String(days)} days ago`;
}

function describeRange(range: { from: number | null; to: number | null } | undefined): string {
  if (!range || range.from === null || range.to === null) return "";
  const fmt = (ts: number) =>
    new Date(ts).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
  return `, covering ${fmt(range.from)} – ${fmt(range.to)}`;
}

function IntervalChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-full border px-3 py-1 text-xs font-medium",
        active
          ? "bg-primary text-primary-foreground border-transparent"
          : "border-border text-muted-foreground",
      )}
    >
      {children}
    </button>
  );
}

function ModeButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={
        active
          ? "bg-primary text-primary-foreground flex-1 rounded-md px-3 py-1.5 text-sm font-medium"
          : "border-border text-muted-foreground flex-1 rounded-md border px-3 py-1.5 text-sm font-medium"
      }
    >
      {children}
    </button>
  );
}
