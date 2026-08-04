import { z } from "zod";

import { newId } from "@/lib/id";
import { compact } from "@/lib/object";
import { Emoji, ShortText, Timestamp, Uuid } from "./primitives";
import { toRxSchema } from "./to-rx-schema";

export const UnitSchema = z.object({
  id: z.string().max(24),
  label: z.string().max(48),
  symbol: z.string().max(12),
  /** value_in_base = value * factor + offset */
  factor: z.number(),
  offset: z.number().optional(),
  precision: z.number().min(0).max(6).optional(),
});

/**
 * A quantity that things can record — duration, distance, weight, a plain
 * count.
 *
 * Registered once and referenced by many things, so "Distance" means the same
 * scale everywhere and totals across things are directly comparable. Values are
 * always stored in `baseUnit`; the unit a person prefers is presentation and
 * can differ per thing, which is what lets metric and imperial coexist without
 * ever converting the stored data.
 */
export const MeasurementSchema = z.object({
  id: Uuid,
  name: ShortText,
  emoji: Emoji.optional(),
  /** Unit id that values are stored in. Must appear in `units`. */
  baseUnit: z.string().max(24),
  defaultUnit: z.string().max(24),
  units: z.array(UnitSchema),
  /** Quick +/- increments, expressed in `stepUnit`. */
  steps: z.array(z.number()),
  stepUnit: z.string().max(24),
  /** Slug of the predefined measurement this came from, for provenance. */
  builtinId: z.string().max(64).optional(),
  createdAt: Timestamp,
  updatedAt: Timestamp,
});

export type Unit = z.infer<typeof UnitSchema>;
export type Measurement = z.infer<typeof MeasurementSchema>;

export const measurementRxSchema = toRxSchema(MeasurementSchema, {
  version: 0,
  primaryKey: "id",
  indexes: ["updatedAt"],
});

export function newMeasurement(
  input: Pick<Measurement, "name" | "baseUnit" | "defaultUnit" | "units" | "steps" | "stepUnit"> &
    Partial<Measurement>,
): Measurement {
  const now = Date.now();
  return compact({
    id: input.id ?? newId(),
    name: input.name,
    emoji: input.emoji,
    baseUnit: input.baseUnit,
    defaultUnit: input.defaultUnit,
    units: input.units,
    steps: input.steps,
    stepUnit: input.stepUnit,
    builtinId: input.builtinId,
    createdAt: input.createdAt ?? now,
    updatedAt: input.updatedAt ?? now,
  });
}
