import { z } from "zod";

import { MAX_DURATION_MS } from "@/lib/duration";
import { newId } from "@/lib/id";
import { compact } from "@/lib/object";
import { MAX_TS, Timestamp, Uuid } from "./primitives";
import { toRxSchema } from "./to-rx-schema";

export const ATTACHMENT_KINDS = ["audio", "image", "video"] as const;
export type AttachmentKind = (typeof ATTACHMENT_KINDS)[number];

/**
 * Metadata for a media attachment. The bytes themselves live as an RxDB
 * attachment on the same document, keyed by this `id`; this array is the
 * queryable index of them, so a list can render "has audio" without paying to
 * read the blobs.
 *
 * No capture UI ships yet — the schema and the attachments plugin are in place
 * so adding one is a component, not a migration.
 */
export const AttachmentMetaSchema = z.object({
  id: z.string().max(64),
  kind: z.enum(ATTACHMENT_KINDS),
  mimeType: z.string().max(100),
  size: z.number().min(0).max(1_073_741_824).multipleOf(1),
  durationMs: z.number().min(0).max(86_400_000).multipleOf(1).optional(),
  createdAt: Timestamp,
});

export type AttachmentMeta = z.infer<typeof AttachmentMetaSchema>;

export const EventSchema = z.object({
  id: Uuid,
  thingId: Uuid,
  /** When the tap happened. Never edited — this is the audit trail. */
  recordedAt: Timestamp,
  /** When the thing actually happened. Defaults to `recordedAt`, editable. */
  actualAt: Timestamp,
  /**
   * How long it lasted, in milliseconds. Stored canonically in ms rather than
   * as a value plus unit, so totals and comparisons never have to reconcile
   * units — the unit is presentation and lives on the thing.
   */
  durationMs: z.number().min(0).max(MAX_DURATION_MS).multipleOf(1).optional(),
  notes: z.string().max(4000).optional(),
  attachments: z.array(AttachmentMetaSchema),
});

export type TrackedEvent = z.infer<typeof EventSchema>;

export const eventRxSchema = toRxSchema(EventSchema, {
  // v1 added the optional `durationMs`.
  version: 1,
  primaryKey: "id",
  indexes: [
    // "latest event for this thing" and "this thing, in this date range".
    ["thingId", "actualAt"],
    // The Insights timeline and every date-range filter.
    ["actualAt"],
    // "what did I log today", independent of any edits to actualAt.
    ["recordedAt"],
  ],
  // Enables the attachments plugin on this collection from day one.
  attachments: {},
});

export function newEvent(
  input: Pick<TrackedEvent, "thingId"> & Partial<Omit<TrackedEvent, "thingId">>,
): TrackedEvent {
  const now = Date.now();
  const recordedAt = input.recordedAt ?? now;
  return compact({
    id: input.id ?? newId(),
    thingId: input.thingId,
    recordedAt,
    actualAt: input.actualAt ?? recordedAt,
    durationMs: input.durationMs,
    notes: input.notes,
    attachments: input.attachments ?? [],
  });
}

export { MAX_TS };
