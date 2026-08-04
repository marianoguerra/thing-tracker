import { z } from "zod";

import { EventSchema, GroupSchema, MeasurementSchema, ThingSchema } from "@/db/schema";
import { Timestamp } from "@/db/schema/primitives";
import { BACKUP_FORMAT, ENVELOPE_VERSION, PACK_FORMAT } from "./format";

export { BACKUP_FORMAT, ENVELOPE_VERSION, PACK_FORMAT } from "./format";

export const BundleMetaSchema = z.object({
  id: z.string().max(64),
  title: z.string().max(120),
  description: z.string().max(2000).optional(),
  emoji: z.string().max(16).optional(),
  version: z.number().min(0).max(100_000),
});

/**
 * A shareable pack of tag definitions.
 *
 * `groups` is an array rather than a single group: exporting one tag is simply
 * the length-1 case, while a bundle like Habits needs Food, Exercise, Sleep and
 * Activities in one file. One shape means one parser and one merge planner.
 *
 * Never contains events. Packs are definitions, not data.
 */
export const PackEnvelopeSchema = z.object({
  format: z.literal(PACK_FORMAT),
  version: z.number().min(1).max(100_000),
  exportedAt: Timestamp,
  bundle: BundleMetaSchema.optional(),
  groups: z.array(GroupSchema),
  things: z.array(ThingSchema),
  /**
   * The scales the things reference. Travelling with the pack means a recipient
   * who has never seen a custom measurement still gets a usable thing rather
   * than a value with no units — and shared ids mean predefined ones simply
   * match what they already have.
   */
  measurements: z.array(MeasurementSchema).default([]),
});

export type PackEnvelope = z.infer<typeof PackEnvelopeSchema>;

export const AttachmentPayloadSchema = z.object({
  eventId: z.string().max(36),
  attachmentId: z.string().max(64),
  mimeType: z.string().max(100),
  length: z.number().min(0),
  data: z.string(),
});

export const BackupEnvelopeSchema = z.object({
  format: z.literal(BACKUP_FORMAT),
  version: z.number().min(1).max(100_000),
  appVersion: z.string().max(32).optional(),
  exportedAt: Timestamp,
  schemaVersions: z.object({
    things: z.number(),
    groups: z.number(),
    events: z.number(),
    measurements: z.number().optional(),
  }),
  counts: z.object({
    things: z.number(),
    groups: z.number(),
    events: z.number(),
    attachments: z.number(),
  }),
  things: z.array(ThingSchema),
  groups: z.array(GroupSchema),
  events: z.array(EventSchema),
  measurements: z.array(MeasurementSchema).default([]),
  /** Earliest and latest entry the file covers; null when it holds none. */
  range: z.object({ from: z.number().nullable(), to: z.number().nullable() }).optional(),
  /** Always present, empty when there are none, so readers never branch. */
  attachments: z.array(AttachmentPayloadSchema),
  /** Set when attachments were skipped for size; the UI must say so. */
  attachmentsOmitted: z.boolean().optional(),
});

export type BackupEnvelope = z.infer<typeof BackupEnvelopeSchema>;

export const EnvelopeSchema = z.discriminatedUnion("format", [
  PackEnvelopeSchema,
  BackupEnvelopeSchema,
]);

export type Envelope = z.infer<typeof EnvelopeSchema>;

export type ParseResult =
  | { ok: true; envelope: Envelope }
  | { ok: false; reason: string; kind: "not-json" | "unknown-format" | "too-new" | "invalid" };

/**
 * Parses a file's text into an envelope.
 *
 * Distinguishes the failure modes because they need different words: "this
 * isn't a Thing Tracker file" is a wrong-file mistake, "made by a newer
 * version" is a fixable upgrade, and a validation failure should name the
 * offending field rather than shrug.
 */
export function parseEnvelope(text: string): ParseResult {
  let decoded: unknown;
  try {
    decoded = JSON.parse(text);
  } catch {
    return { ok: false, kind: "not-json", reason: "That file isn't JSON." };
  }

  if (typeof decoded !== "object" || decoded === null) {
    return { ok: false, kind: "unknown-format", reason: "That file isn't a Thing Tracker file." };
  }

  const format = (decoded as { format?: unknown }).format;
  if (format !== PACK_FORMAT && format !== BACKUP_FORMAT) {
    return {
      ok: false,
      kind: "unknown-format",
      reason: "That file isn't a Thing Tracker export.",
    };
  }

  // Checked before full validation so a future format reports as "too new"
  // rather than as a pile of unrecognised-field errors.
  const version = (decoded as { version?: unknown }).version;
  if (typeof version === "number" && version > ENVELOPE_VERSION) {
    return {
      ok: false,
      kind: "too-new",
      reason: `That file was made by a newer version of Thing Tracker (format v${String(version)}). Update the app and try again.`,
    };
  }

  const result = EnvelopeSchema.safeParse(decoded);
  if (!result.success) {
    const issue = result.error.issues[0];
    const path = issue?.path.join(".") || "(root)";
    return {
      ok: false,
      kind: "invalid",
      reason: `That file is damaged: ${issue?.message ?? "invalid"} at ${path}.`,
    };
  }

  return { ok: true, envelope: result.data };
}
