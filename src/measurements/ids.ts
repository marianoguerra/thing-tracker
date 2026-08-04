import { v5 as uuidv5 } from "uuid";

// Relative and extension-bearing: shared with scripts/build-bundles.ts, which
// runs under plain Node where the `@/` alias does not exist. Only ./ids and
// ./definitions are pulled in at runtime; the schema import is type-only.
import { BUNDLE_NAMESPACE } from "../bundles/ids.ts";
import type { Measurement } from "../db/schema/measurement.ts";
import { MEASUREMENT_DEFS, type MeasurementDef } from "./definitions.ts";

/**
 * Same namespace and same reasoning as bundle ids: a measurement must mean the
 * same thing in everyone's data, or a shared thing that records "Distance"
 * would point at a different scale on each device.
 */
export const measurementIdName = (slug: string) => `measurement:${slug}`;

export function measurementId(slug: string): string {
  return uuidv5(measurementIdName(slug), BUNDLE_NAMESPACE);
}

/** Ids of the predefined measurements, by slug. */
export const BUILTIN_MEASUREMENT_IDS: Record<string, string> = Object.fromEntries(
  MEASUREMENT_DEFS.map((def) => [def.slug, measurementId(def.slug)]),
);

export const DURATION_MEASUREMENT_ID = measurementId("duration");

/** Fixed so a rebuild is not a diff; these are definitions, not events. */
const EPOCH = 0;

export function toMeasurement(def: MeasurementDef): Measurement {
  return {
    id: measurementId(def.slug),
    name: def.name,
    emoji: def.emoji,
    baseUnit: def.baseUnit,
    defaultUnit: def.defaultUnit,
    units: def.units,
    steps: def.steps,
    stepUnit: def.stepUnit,
    builtinId: def.slug,
    createdAt: EPOCH,
    updatedAt: EPOCH,
  };
}

export function builtinMeasurements(): Measurement[] {
  return MEASUREMENT_DEFS.map(toMeasurement);
}
