export type UnitDef = {
  /** Stable within its measurement, e.g. "km". Used as the stored unit key. */
  id: string;
  label: string;
  symbol: string;
  /**
   * value_in_base = value * factor + offset
   *
   * The offset exists for temperature, the one everyday scale that isn't a
   * pure ratio. Everything else leaves it at 0.
   */
  factor: number;
  offset?: number;
  /** Decimal places to show. Kilometres want 2; steps want 0. */
  precision?: number;
};

export function toBase(value: number, unit: UnitDef): number {
  return value * unit.factor + (unit.offset ?? 0);
}

export function fromBase(base: number, unit: UnitDef): number {
  return (base - (unit.offset ?? 0)) / unit.factor;
}

/** Rounds for display without dragging in floating-point noise. */
export function roundTo(value: number, precision: number): number {
  const scale = 10 ** precision;
  return Math.round(value * scale) / scale;
}

export function formatUnitValue(base: number, unit: UnitDef): string {
  const value = roundTo(fromBase(base, unit), unit.precision ?? 2);
  return `${String(value)}${unit.symbol}`;
}

export function findUnit(units: readonly UnitDef[], id: string | undefined): UnitDef | undefined {
  return id === undefined ? undefined : units.find((unit) => unit.id === id);
}

/**
 * The unit a value reads most naturally in.
 *
 * Picks the largest unit that keeps the number at or above 1, so 5400000ms
 * shows as "1.5h" rather than "5400000ms" and 500m stays "500m" rather than
 * becoming "0.5km". Offset units are skipped — there is no "natural" choice
 * between °C and °F, only a preference.
 */
export function naturalUnit(base: number, units: readonly UnitDef[], fallback: UnitDef): UnitDef {
  const ratioUnits = units.filter((unit) => !unit.offset).sort((a, b) => b.factor - a.factor);
  if (ratioUnits.length === 0) return fallback;
  const magnitude = Math.abs(base);
  return ratioUnits.find((unit) => magnitude >= unit.factor) ?? ratioUnits.at(-1) ?? fallback;
}
