import type { AppCollectionsCtx } from "@/db/collections";
import type { Measurement, Thing } from "@/db/schema";
import type { MeasurementPrompt } from "@/components/measure/MeasurementSheet";

export function indexMeasurements(rows: readonly Measurement[]): Map<string, Measurement> {
  return new Map(rows.map((row) => [row.id, row]));
}

/**
 * Past values a thing has recorded for each measurement, newest first.
 *
 * Feeds both the pre-filled default and the "usual" chips, which together are
 * what keep a measured log close to a single tap.
 */
export function measurementHistory(
  collections: AppCollectionsCtx,
  thingId: string,
  measurementId: string,
): number[] {
  return collections.events.toArray
    .filter((event) => event.thingId === thingId)
    .sort((a, b) => b.actualAt - a.actualAt)
    .flatMap((event) =>
      event.measurements.filter((m) => m.measurementId === measurementId).map((m) => m.value),
    )
    .filter((value) => value > 0);
}

/** Builds the sheet's inputs, skipping references to deleted measurements. */
export function buildPrompts(
  collections: AppCollectionsCtx,
  thing: Thing,
  byId: Map<string, Measurement>,
): MeasurementPrompt[] {
  return thing.measurements.flatMap((ref) => {
    const measurement = byId.get(ref.measurementId);
    if (!measurement) return [];
    return [
      {
        measurement,
        unitId: ref.unit,
        history: measurementHistory(collections, thing.id, measurement.id),
      } satisfies MeasurementPrompt,
    ];
  });
}
