import { z } from "zod";

import { newId } from "@/lib/id";
import { compact } from "@/lib/object";
import { BundleId, Emoji, HexColor, LongText, ShortText, Timestamp, Uuid } from "./primitives";
import { toRxSchema } from "./to-rx-schema";

/**
 * A thing you track. Standalone by design: groups reference things, never the
 * other way round, so a shared thing keeps its identity no matter how any
 * particular user chooses to organise it.
 */
/**
 * A measurement this thing records, referenced by id.
 *
 * `unit` overrides the measurement's own default for this thing alone, because
 * the natural unit is a property of the pairing rather than the scale: a plank
 * is seconds and a night's sleep is hours, but both are Duration.
 */
export const ThingMeasurementSchema = z.object({
  measurementId: Uuid,
  unit: z.string().max(24).optional(),
});

export const ThingSchema = z.object({
  id: Uuid,
  /** Required — emoji is how a thing is recognised, not decoration. */
  emoji: Emoji,
  title: ShortText,
  description: LongText.optional(),
  color: HexColor.optional(),
  archived: z.boolean(),
  /** Empty means one tap logs it outright, with nothing to fill in. */
  measurements: z.array(ThingMeasurementSchema),
  /** Set when the thing came from a predefined bundle; provenance only. */
  bundleId: BundleId.optional(),
  createdAt: Timestamp,
  updatedAt: Timestamp,
});

export type Thing = z.infer<typeof ThingSchema>;

export const thingRxSchema = toRxSchema(ThingSchema, {
  // v1 added an optional `duration` config; v2 generalised it to `measurements`.
  version: 2,
  primaryKey: "id",
  // `archived` is deliberately absent: RxDB cannot index booleans, and the
  // filter happens in the in-memory live query anyway.
  indexes: ["updatedAt"],
});

export function newThing(
  input: Pick<Thing, "emoji" | "title"> & Partial<Omit<Thing, "emoji" | "title">>,
): Thing {
  const now = Date.now();
  return compact({
    id: input.id ?? newId(),
    emoji: input.emoji,
    title: input.title,
    description: input.description,
    color: input.color,
    archived: input.archived ?? false,
    measurements: input.measurements ?? [],
    bundleId: input.bundleId,
    createdAt: input.createdAt ?? now,
    updatedAt: input.updatedAt ?? now,
  });
}
