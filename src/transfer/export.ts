import type { AppCollectionsCtx } from "@/db/collections";
import type { AppDatabase } from "@/db/database";
import {
  EventSchema,
  GroupSchema,
  ThingSchema,
  type Group,
  type Thing,
  type TrackedEvent,
} from "@/db/schema";
import {
  BACKUP_FORMAT,
  ENVELOPE_VERSION,
  PACK_FORMAT,
  type BackupEnvelope,
  type PackEnvelope,
} from "./envelope";

/**
 * Beyond this, a backup stops being a file people can email themselves and
 * starts being something browsers struggle to serialise in one string.
 */
const MAX_ATTACHMENT_BYTES = 64 * 1024 * 1024;

/**
 * Strips everything that isn't part of the declared schema.
 *
 * `collection.toArray` hands back records decorated with TanStack DB's own
 * bookkeeping (`$key`, `$synced`, `$origin`, `$collectionId`). Those are
 * meaningless outside this device and must never reach a file people keep for
 * years or hand to someone else. Parsing through the schema also guarantees
 * every export validates on the way back in.
 */
const cleanThings = (rows: readonly Thing[]): Thing[] => rows.map((row) => ThingSchema.parse(row));
const cleanGroups = (rows: readonly Group[]): Group[] => rows.map((row) => GroupSchema.parse(row));
const cleanEvents = (rows: readonly TrackedEvent[]): TrackedEvent[] =>
  rows.map((row) => EventSchema.parse(row));

/**
 * Builds a shareable pack from a set of tags plus every thing they reference.
 *
 * The referenced things travel with the pack, ids intact, which is what lets
 * the recipient record against the same identifiers as the sender.
 */
export function buildPack(
  groups: readonly Group[],
  allThings: readonly Thing[],
  bundle?: PackEnvelope["bundle"],
): PackEnvelope {
  const byId = new Map(allThings.map((thing) => [thing.id, thing]));
  const wanted = new Set(groups.flatMap((group) => group.thingIds));
  const things = [...wanted].map((id) => byId.get(id)).filter((t): t is Thing => t !== undefined);

  return {
    format: PACK_FORMAT,
    version: ENVELOPE_VERSION,
    exportedAt: Date.now(),
    ...(bundle ? { bundle } : {}),
    // Membership is narrowed to things actually included, so the file is
    // internally consistent and importing it produces no phantom warnings.
    groups: cleanGroups(
      groups.map((group) => ({
        ...group,
        thingIds: group.thingIds.filter((id) => byId.has(id)),
      })),
    ),
    things: cleanThings(things),
  };
}

/**
 * Builds a full backup.
 *
 * RxDB's own `exportJSON` is deliberately not used: it emits the internal
 * document shape including `_rev`/`_meta`, omits attachments entirely, and
 * offers no say in how an import reconciles. Hand-rolling costs a function and
 * buys a versioned, testable format we control.
 */
export async function buildBackup(
  db: AppDatabase,
  collections: AppCollectionsCtx,
  appVersion?: string,
): Promise<BackupEnvelope> {
  const things = cleanThings(collections.things.toArray);
  const groups = cleanGroups(collections.groups.toArray);
  const events = cleanEvents(collections.events.toArray);

  const attachments: BackupEnvelope["attachments"] = [];
  let totalBytes = 0;
  let omitted = false;

  const docs = await db.events.find().exec();
  for (const doc of docs) {
    for (const attachment of doc.allAttachments()) {
      if (totalBytes > MAX_ATTACHMENT_BYTES) {
        omitted = true;
        break;
      }
      const data = await attachment.getDataBase64();
      totalBytes += data.length;
      attachments.push({
        eventId: doc.id,
        attachmentId: attachment.id,
        mimeType: attachment.type,
        length: attachment.length,
        data,
      });
    }
    if (omitted) break;
  }

  return {
    format: BACKUP_FORMAT,
    version: ENVELOPE_VERSION,
    ...(appVersion ? { appVersion } : {}),
    exportedAt: Date.now(),
    schemaVersions: { things: 0, groups: 0, events: 0 },
    counts: {
      things: things.length,
      groups: groups.length,
      events: events.length,
      attachments: omitted ? 0 : attachments.length,
    },
    things,
    groups,
    events,
    // Never silently: if media was dropped, the envelope says so and the UI
    // repeats it, because a backup you think is complete is worse than none.
    attachments: omitted ? [] : attachments,
    ...(omitted ? { attachmentsOmitted: true } : {}),
  };
}

export function packFilename(groups: readonly Group[], bundleId?: string): string {
  const slug = bundleId ?? (groups.length === 1 ? slugify(groups[0]!.title) : "tags");
  return `thing-tracker-pack-${slug}-${isoDate()}.json`;
}

export function backupFilename(): string {
  return `thing-tracker-backup-${isoDate()}.json`;
}

function isoDate(): string {
  const d = new Date();
  return `${String(d.getFullYear())}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "untitled"
  );
}
