import type { Group, Thing, TrackedEvent } from "@/db/schema";
import type { BackupEnvelope, PackEnvelope } from "./envelope";

/** A snapshot of local state. Pure input — planning never touches the store. */
export type LocalSnapshot = {
  things: readonly Thing[];
  groups: readonly Group[];
  events: readonly TrackedEvent[];
};

export type GroupMerge = { id: string; title: string; addedThingIds: string[] };

export type ImportPlan = {
  kind: "pack" | "backup";
  mode: "merge" | "replace";
  things: { create: Thing[]; update: Thing[]; unchanged: Thing[] };
  groups: {
    create: Group[];
    /** Whole-document overwrite of an existing group (backup restore only). */
    replace: Group[];
    /** Membership-only union; the local group keeps its own labels. */
    mergeInto: GroupMerge[];
    unchanged: Group[];
  };
  events: { create: TrackedEvent[]; skipped: number };
  warnings: string[];
};

const emptyPlan = (kind: ImportPlan["kind"], mode: ImportPlan["mode"]): ImportPlan => ({
  kind,
  mode,
  things: { create: [], update: [], unchanged: [] },
  groups: { create: [], replace: [], mergeInto: [], unchanged: [] },
  events: { create: [], skipped: 0 },
  warnings: [],
});

export type PackImportOptions = {
  /** Off by default: an incoming pack should not rename or repaint your things. */
  overwriteThingDetails?: boolean;
};

/**
 * Plans importing a share pack or bundle.
 *
 * Three invariants make shared data actually shareable:
 *
 * 1. Thing ids are never rewritten. That is the entire point — two people who
 *    load the same pack record against the same identifiers, so their data can
 *    later be compared.
 * 2. Local wins by default. Groups are the per-user layer; an incoming file
 *    must not rename your tag or relabel your things.
 * 3. Membership merges as a set union, never a replace, which makes importing
 *    the same pack twice a no-op.
 */
export function planPackImport(
  pack: PackEnvelope,
  local: LocalSnapshot,
  options: PackImportOptions = {},
): ImportPlan {
  const plan = emptyPlan("pack", "merge");
  const overwrite = options.overwriteThingDetails ?? false;

  const localThings = new Map(local.things.map((thing) => [thing.id, thing]));
  const localGroups = new Map(local.groups.map((group) => [group.id, group]));

  for (const incoming of pack.things) {
    const existing = localThings.get(incoming.id);
    if (!existing) {
      plan.things.create.push(incoming);
    } else if (overwrite) {
      plan.things.update.push({
        ...existing,
        ...incoming,
        // Provenance of the local record, not the sender's.
        createdAt: existing.createdAt,
        updatedAt: Date.now(),
      });
    } else {
      plan.things.unchanged.push(existing);
    }
  }

  const known = new Set([...localThings.keys(), ...plan.things.create.map((t) => t.id)]);
  let nextSortOrder = local.groups.reduce((max, g) => Math.max(max, g.sortOrder), -1) + 1;

  for (const incoming of pack.groups) {
    const missing = incoming.thingIds.filter((id) => !known.has(id));
    if (missing.length > 0) {
      plan.warnings.push(
        `“${incoming.title}” refers to ${String(missing.length)} thing${missing.length === 1 ? "" : "s"} the file doesn't include; they'll be skipped.`,
      );
    }
    const members = incoming.thingIds.filter((id) => known.has(id));

    const existing = localGroups.get(incoming.id);
    if (!existing) {
      plan.groups.create.push({
        ...incoming,
        thingIds: members,
        sortOrder: nextSortOrder++,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      continue;
    }

    const added = members.filter((id) => !existing.thingIds.includes(id));
    if (added.length > 0) {
      // Only membership merges. Title, emoji and colour are this user's own
      // labels for their own tag and are left exactly as they are.
      plan.groups.mergeInto.push({ id: existing.id, title: existing.title, addedThingIds: added });
    } else {
      plan.groups.unchanged.push(existing);
    }
  }

  return plan;
}

/**
 * Plans restoring a backup.
 *
 * `merge` reconciles by id with last-write-wins on `updatedAt` (ties go local),
 * except group membership, which unions regardless of recency — a union can
 * only ever be wrong by including something, whereas picking a side silently
 * drops tags the other side had.
 *
 * Events are append-only, so a known id is skipped rather than overwritten;
 * restoring the same backup twice must not duplicate history.
 */
export function planBackupImport(
  backup: BackupEnvelope,
  local: LocalSnapshot,
  mode: "merge" | "replace",
): ImportPlan {
  const plan = emptyPlan("backup", mode);

  if (mode === "replace") {
    plan.things.create.push(...backup.things);
    plan.groups.create.push(...backup.groups);
    plan.events.create.push(...backup.events);
    plan.warnings.push(
      `Replaces everything on this device: ${String(local.things.length)} things, ${String(local.groups.length)} tags and ${String(local.events.length)} entries will be deleted.`,
    );
    return plan;
  }

  const localThings = new Map(local.things.map((thing) => [thing.id, thing]));
  for (const incoming of backup.things) {
    const existing = localThings.get(incoming.id);
    if (!existing) plan.things.create.push(incoming);
    else if (incoming.updatedAt > existing.updatedAt) plan.things.update.push(incoming);
    else plan.things.unchanged.push(existing);
  }

  const localGroups = new Map(local.groups.map((group) => [group.id, group]));
  for (const incoming of backup.groups) {
    const existing = localGroups.get(incoming.id);
    if (!existing) {
      plan.groups.create.push(incoming);
      continue;
    }
    const added = incoming.thingIds.filter((id) => !existing.thingIds.includes(id));
    if (incoming.updatedAt > existing.updatedAt) {
      // Newer labels win, but membership still unions rather than replacing:
      // dropping a tag the local copy had is a silent, unrecoverable loss.
      plan.groups.replace.push({
        ...incoming,
        thingIds: [...new Set([...existing.thingIds, ...incoming.thingIds])],
      });
    } else if (added.length > 0) {
      plan.groups.mergeInto.push({ id: existing.id, title: existing.title, addedThingIds: added });
    } else {
      plan.groups.unchanged.push(existing);
    }
  }

  const localEventIds = new Set(local.events.map((event) => event.id));
  for (const incoming of backup.events) {
    if (localEventIds.has(incoming.id)) plan.events.skipped += 1;
    else plan.events.create.push(incoming);
  }

  if (backup.attachmentsOmitted) {
    plan.warnings.push("This backup was exported without its media attachments.");
  }

  return plan;
}

/** True when applying the plan would change nothing. */
export function isNoopPlan(plan: ImportPlan): boolean {
  return (
    plan.mode !== "replace" &&
    plan.things.create.length === 0 &&
    plan.things.update.length === 0 &&
    plan.groups.create.length === 0 &&
    plan.groups.replace.length === 0 &&
    plan.groups.mergeInto.length === 0 &&
    plan.events.create.length === 0
  );
}

/** "1 thing" / "3 things" — counts are read aloud constantly here. */
function plural(count: number, singular: string, pluralForm = `${singular}s`): string {
  return `${String(count)} ${count === 1 ? singular : pluralForm}`;
}

export function summarizePlan(plan: ImportPlan): string[] {
  const lines: string[] = [];
  const { things, groups, events } = plan;

  if (things.create.length) lines.push(`${plural(things.create.length, "new thing")}`);
  if (things.update.length) lines.push(`${plural(things.update.length, "thing")} updated`);
  if (things.unchanged.length) lines.push(`${String(things.unchanged.length)} already yours`);
  if (groups.create.length) lines.push(`${plural(groups.create.length, "new tag")}`);
  if (groups.replace.length) lines.push(`${plural(groups.replace.length, "tag")} updated`);
  for (const merge of groups.mergeInto) {
    lines.push(`${plural(merge.addedThingIds.length, "thing")} added to “${merge.title}”`);
  }
  if (events.create.length)
    lines.push(`${plural(events.create.length, "entry", "entries")} restored`);
  if (events.skipped) {
    lines.push(`${plural(events.skipped, "entry", "entries")} already present`);
  }

  if (lines.length === 0) lines.push("Nothing to change — you already have all of this.");
  return lines;
}
