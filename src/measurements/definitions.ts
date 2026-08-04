import type { UnitDef } from "../lib/measure/convert.ts";

export type MeasurementDef = {
  /** Stable identity. Never rename one; add a new slug instead. */
  slug: string;
  name: string;
  emoji: string;
  baseUnit: string;
  defaultUnit: string;
  units: UnitDef[];
  /** Quick +/- increments, expressed in `stepUnit`. */
  steps: number[];
  stepUnit: string;
};

/**
 * The measurements that ship with the app.
 *
 * Metric and imperial units live inside the *same* measurement rather than in
 * separate ones. A kilometre and a mile measure the same thing, so splitting
 * them would make two people's running data incomparable for no reason —
 * instead everything is stored in one base unit and each person picks the unit
 * they think in.
 *
 * Ids are UUIDv5 over the shared namespace, exactly like bundles, so a
 * measurement means the same thing in everybody's data.
 */
export const MEASUREMENT_DEFS: MeasurementDef[] = [
  {
    slug: "duration",
    name: "Duration",
    emoji: "⏱️",
    baseUnit: "ms",
    defaultUnit: "min",
    units: [
      { id: "ms", label: "milliseconds", symbol: "ms", factor: 1, precision: 0 },
      { id: "s", label: "seconds", symbol: "s", factor: 1000, precision: 0 },
      { id: "min", label: "minutes", symbol: "m", factor: 60_000, precision: 0 },
      { id: "h", label: "hours", symbol: "h", factor: 3_600_000, precision: 2 },
      { id: "d", label: "days", symbol: "d", factor: 86_400_000, precision: 2 },
    ],
    steps: [1, 5, 10, 15, 30, 60],
    stepUnit: "min",
  },
  {
    slug: "count",
    name: "Count",
    emoji: "🔢",
    baseUnit: "x",
    defaultUnit: "x",
    units: [{ id: "x", label: "times", symbol: "×", factor: 1, precision: 0 }],
    steps: [1, 2, 5, 10, 25, 100],
    stepUnit: "x",
  },
  {
    slug: "distance",
    name: "Distance",
    emoji: "📏",
    baseUnit: "m",
    defaultUnit: "km",
    units: [
      { id: "cm", label: "centimetres", symbol: "cm", factor: 0.01, precision: 1 },
      { id: "m", label: "metres", symbol: "m", factor: 1, precision: 1 },
      { id: "km", label: "kilometres", symbol: "km", factor: 1000, precision: 2 },
      { id: "in", label: "inches", symbol: "in", factor: 0.0254, precision: 1 },
      { id: "ft", label: "feet", symbol: "ft", factor: 0.3048, precision: 1 },
      { id: "yd", label: "yards", symbol: "yd", factor: 0.9144, precision: 1 },
      { id: "mi", label: "miles", symbol: "mi", factor: 1609.344, precision: 2 },
    ],
    steps: [0.1, 0.5, 1, 2, 5, 10],
    stepUnit: "km",
  },
  {
    slug: "weight",
    name: "Weight",
    emoji: "⚖️",
    baseUnit: "g",
    defaultUnit: "kg",
    units: [
      { id: "g", label: "grams", symbol: "g", factor: 1, precision: 0 },
      { id: "kg", label: "kilograms", symbol: "kg", factor: 1000, precision: 2 },
      { id: "oz", label: "ounces", symbol: "oz", factor: 28.349523125, precision: 1 },
      { id: "lb", label: "pounds", symbol: "lb", factor: 453.59237, precision: 2 },
      { id: "st", label: "stone", symbol: "st", factor: 6350.29318, precision: 2 },
    ],
    steps: [0.1, 0.5, 1, 2, 5, 10],
    stepUnit: "kg",
  },
  {
    slug: "volume",
    name: "Volume",
    emoji: "🥤",
    baseUnit: "ml",
    defaultUnit: "ml",
    units: [
      { id: "ml", label: "millilitres", symbol: "ml", factor: 1, precision: 0 },
      { id: "l", label: "litres", symbol: "l", factor: 1000, precision: 2 },
      {
        id: "floz",
        label: "fluid ounces (US)",
        symbol: "fl oz",
        factor: 29.5735295625,
        precision: 1,
      },
      { id: "cup", label: "cups (US)", symbol: "cup", factor: 236.5882365, precision: 2 },
      { id: "pt", label: "pints (US)", symbol: "pt", factor: 473.176473, precision: 2 },
      { id: "galuk", label: "gallons (UK)", symbol: "gal", factor: 4546.09, precision: 2 },
    ],
    steps: [50, 100, 250, 330, 500, 1000],
    stepUnit: "ml",
  },
  {
    slug: "temperature",
    name: "Temperature",
    emoji: "🌡️",
    baseUnit: "c",
    defaultUnit: "c",
    units: [
      { id: "c", label: "Celsius", symbol: "°C", factor: 1, precision: 1 },
      // The only everyday scale that isn't a pure ratio: °C = °F * 5/9 - 160/9.
      { id: "f", label: "Fahrenheit", symbol: "°F", factor: 5 / 9, offset: -160 / 9, precision: 1 },
      { id: "k", label: "Kelvin", symbol: "K", factor: 1, offset: -273.15, precision: 1 },
    ],
    steps: [0.1, 0.5, 1, 5],
    stepUnit: "c",
  },
  {
    slug: "energy",
    name: "Energy",
    emoji: "🔥",
    baseUnit: "kcal",
    defaultUnit: "kcal",
    units: [
      { id: "kcal", label: "kilocalories", symbol: "kcal", factor: 1, precision: 0 },
      { id: "kj", label: "kilojoules", symbol: "kJ", factor: 0.239005736, precision: 0 },
    ],
    steps: [10, 50, 100, 250, 500],
    stepUnit: "kcal",
  },
  {
    slug: "steps",
    name: "Steps",
    emoji: "👣",
    baseUnit: "step",
    defaultUnit: "step",
    units: [{ id: "step", label: "steps", symbol: " steps", factor: 1, precision: 0 }],
    steps: [100, 500, 1000, 2500, 5000],
    stepUnit: "step",
  },
  {
    slug: "rating",
    name: "Rating",
    emoji: "⭐",
    baseUnit: "pt",
    defaultUnit: "pt",
    units: [{ id: "pt", label: "out of 10", symbol: "/10", factor: 1, precision: 1 }],
    steps: [0.5, 1, 2],
    stepUnit: "pt",
  },
];

export const MEASUREMENT_DEF_BY_SLUG = new Map(MEASUREMENT_DEFS.map((def) => [def.slug, def]));
