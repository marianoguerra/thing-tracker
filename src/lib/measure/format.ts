import type { Measurement } from "@/db/schema";
import { findUnit, fromBase, naturalUnit, roundTo, type UnitDef } from "./convert";

const DURATION_BASE = "ms";

/**
 * Formats a base-unit value for display.
 *
 * Duration gets the mixed "1h 30m" form because that is how people say it and a
 * bare "1.5h" is easy to misread. Everything else is a number and a symbol.
 */
export function formatMeasurement(
  measurement: Measurement,
  base: number,
  preferredUnitId?: string,
): string {
  if (measurement.baseUnit === DURATION_BASE) return formatDurationMs(base);

  const unit =
    findUnit(measurement.units, preferredUnitId) ??
    findUnit(measurement.units, measurement.defaultUnit) ??
    measurement.units[0];
  if (!unit) return String(base);

  return `${String(roundTo(fromBase(base, unit), unit.precision ?? 2))}${unit.symbol}`;
}

export function formatDurationMs(ms: number): string {
  if (ms <= 0) return "0m";
  const days = Math.floor(ms / 86_400_000);
  const hours = Math.floor((ms % 86_400_000) / 3_600_000);
  const minutes = Math.floor((ms % 3_600_000) / 60_000);
  const seconds = Math.round((ms % 60_000) / 1000);

  if (days > 0) return hours > 0 ? `${String(days)}d ${String(hours)}h` : `${String(days)}d`;
  if (hours > 0) return minutes > 0 ? `${String(hours)}h ${String(minutes)}m` : `${String(hours)}h`;
  if (minutes > 0) {
    return seconds > 0 && minutes < 5
      ? `${String(minutes)}m ${String(seconds)}s`
      : `${String(minutes)}m`;
  }
  return `${String(seconds)}s`;
}

/** The unit to open an editor in: the thing's preference, else the scale's. */
export function preferredUnit(
  measurement: Measurement,
  thingUnitId: string | undefined,
  currentValue?: number,
): UnitDef {
  const fallback = measurement.units[0]!;
  const explicit =
    findUnit(measurement.units, thingUnitId) ??
    findUnit(measurement.units, measurement.defaultUnit);
  if (explicit) return explicit;
  return currentValue === undefined
    ? fallback
    : naturalUnit(currentValue, measurement.units, fallback);
}

/**
 * The values this thing is most often recorded with, most frequent first.
 *
 * Quantities repeat — the same 5 km run, the same 500 ml bottle — so offering
 * the usual ones as chips turns the common case back into a single tap.
 */
export function commonValues(
  values: readonly number[],
  limit = 6,
): { value: number; count: number }[] {
  const counts = new Map<number, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return [...counts.entries()]
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count || a.value - b.value)
    .slice(0, limit);
}
