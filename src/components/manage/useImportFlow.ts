import { useCallback, useState } from "react";
import { toast } from "sonner";

import { useDb } from "@/db/provider";
import type { BackupEnvelope, Envelope, PackEnvelope } from "@/transfer/envelope";
import { parseEnvelope } from "@/transfer/envelope";
import { applyImport, snapshot } from "@/transfer/import";
import { planBackupImport, planPackImport, type ImportPlan } from "@/transfer/plan";

type Pending = {
  envelope: Envelope;
  title: string;
  mode: "merge" | "replace";
};

/**
 * The single import path. Bundles, shared files and backup restores all go
 * through it, so there is one place where merge semantics live and one place
 * that can get them wrong.
 */
export function useImportFlow() {
  const { db, collections } = useDb();
  const [pending, setPending] = useState<Pending | null>(null);
  const [plan, setPlan] = useState<ImportPlan | null>(null);
  const [overwrite, setOverwrite] = useState(false);
  const [busy, setBusy] = useState(false);

  const replan = useCallback(
    (next: Pending, overwriteDetails: boolean) => {
      const local = snapshot(collections);
      setPlan(
        next.envelope.format === "thing-tracker/group-pack"
          ? planPackImport(next.envelope, local, { overwriteThingDetails: overwriteDetails })
          : planBackupImport(next.envelope, local, next.mode),
      );
    },
    [collections],
  );

  const begin = useCallback(
    (envelope: Envelope, title: string, mode: "merge" | "replace" = "merge") => {
      const next = { envelope, title, mode };
      setOverwrite(false);
      setPending(next);
      replan(next, false);
    },
    [replan],
  );

  /** Parses arbitrary file text and starts the flow, or reports why it can't. */
  const beginFromText = useCallback(
    (text: string, mode: "merge" | "replace" = "merge") => {
      const result = parseEnvelope(text);
      if (!result.ok) {
        toast.error("Couldn't read that file", { description: result.reason });
        return;
      }
      const title =
        result.envelope.format === "thing-tracker/group-pack"
          ? (result.envelope.bundle?.title ?? "Import tags")
          : "Restore backup";
      begin(result.envelope, title, mode);
    },
    [begin],
  );

  const setOverwriteThingDetails = useCallback(
    (next: boolean) => {
      setOverwrite(next);
      if (pending) replan(pending, next);
    },
    [pending, replan],
  );

  const cancel = useCallback(() => {
    setPending(null);
    setPlan(null);
  }, []);

  const confirm = useCallback(async () => {
    if (!plan || !pending) return;
    setBusy(true);
    try {
      const attachments =
        pending.envelope.format === "thing-tracker/backup"
          ? (pending.envelope as BackupEnvelope).attachments
          : [];
      const result = await applyImport(plan, db, collections, attachments);
      const parts = [
        result.thingsCreated && `${String(result.thingsCreated)} things`,
        result.groupsCreated && `${String(result.groupsCreated)} tags`,
        result.eventsCreated && `${String(result.eventsCreated)} entries`,
      ].filter(Boolean);
      toast.success("Imported", {
        description: parts.length ? `Added ${parts.join(", ")}.` : "Everything was already here.",
      });
      cancel();
    } catch (error) {
      // Surface the failure rather than leaving a half-applied import silent.
      toast.error("Import failed", {
        description: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setBusy(false);
    }
  }, [plan, pending, db, collections, cancel]);

  return {
    plan,
    title: pending?.title ?? "",
    busy,
    overwrite,
    setOverwriteThingDetails,
    begin,
    beginFromText,
    beginPack: (pack: PackEnvelope, title: string) => begin(pack, title),
    confirm,
    cancel,
  };
}
