import { describe, expect, it } from "vite-plus/test";

import { MEASUREMENT_DEFS, MEASUREMENT_DEF_BY_SLUG } from "@/measurements/definitions";
import { findUnit, fromBase, naturalUnit, roundTo, toBase } from "./convert";

const distance = MEASUREMENT_DEF_BY_SLUG.get("distance")!;
const temperature = MEASUREMENT_DEF_BY_SLUG.get("temperature")!;
const duration = MEASUREMENT_DEF_BY_SLUG.get("duration")!;

const unit = (def: typeof distance, id: string) => findUnit(def.units, id)!;

describe("unit conversion", () => {
  it("round-trips every unit of every predefined measurement", () => {
    for (const def of MEASUREMENT_DEFS) {
      for (const u of def.units) {
        for (const value of [0, 1, 7.5, 1234]) {
          expect(roundTo(fromBase(toBase(value, u), u), 6)).toBe(value);
        }
      }
    }
  });

  it("converts metric to imperial", () => {
    expect(toBase(5, unit(distance, "km"))).toBe(5000);
    expect(roundTo(fromBase(5000, unit(distance, "mi")), 2)).toBe(3.11);
    expect(roundTo(fromBase(1, unit(distance, "in")), 4)).toBe(39.3701);
  });

  it("handles the one scale that isn't a pure ratio", () => {
    // Temperature needs an offset as well as a factor; a ratio-only model
    // would put 0°C at 0°F.
    expect(roundTo(toBase(32, unit(temperature, "f")), 6)).toBe(0);
    expect(roundTo(toBase(212, unit(temperature, "f")), 6)).toBe(100);
    expect(roundTo(toBase(-40, unit(temperature, "f")), 6)).toBe(-40);
    expect(roundTo(fromBase(37, unit(temperature, "f")), 1)).toBe(98.6);
    expect(roundTo(toBase(273.15, unit(temperature, "k")), 6)).toBe(0);
  });

  it("keeps the same real quantity when the display unit changes", () => {
    // The property the sheet relies on: switching km → mi must not
    // reinterpret 5 as 5 miles.
    const base = toBase(5, unit(distance, "km"));
    expect(roundTo(fromBase(base, unit(distance, "mi")), 2)).toBe(3.11);
    expect(toBase(fromBase(base, unit(distance, "mi")), unit(distance, "mi"))).toBeCloseTo(base, 6);
  });

  it("picks a readable natural unit", () => {
    const fallback = duration.units[0]!;
    expect(naturalUnit(5_400_000, duration.units, fallback).id).toBe("h");
    expect(naturalUnit(90_000, duration.units, fallback).id).toBe("min");
    expect(naturalUnit(500, duration.units, fallback).id).toBe("ms");
    expect(naturalUnit(500, distance.units, distance.units[0]!).id).toBe("m");
  });
});

describe("measurement definitions", () => {
  it("declares a base unit that exists and converts 1:1", () => {
    for (const def of MEASUREMENT_DEFS) {
      const base = findUnit(def.units, def.baseUnit);
      expect(base, `${def.slug} baseUnit`).toBeDefined();
      // Anything else would mean stored values aren't actually in the base
      // unit, quietly scaling every recorded number.
      expect(base?.factor, `${def.slug} base factor`).toBe(1);
      expect(base?.offset ?? 0, `${def.slug} base offset`).toBe(0);
    }
  });

  it("declares default and step units that exist", () => {
    for (const def of MEASUREMENT_DEFS) {
      expect(findUnit(def.units, def.defaultUnit), `${def.slug} defaultUnit`).toBeDefined();
      expect(findUnit(def.units, def.stepUnit), `${def.slug} stepUnit`).toBeDefined();
    }
  });

  it("has unique slugs and unique unit ids within each measurement", () => {
    const slugs = MEASUREMENT_DEFS.map((d) => d.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const def of MEASUREMENT_DEFS) {
      const ids = def.units.map((u) => u.id);
      expect(new Set(ids).size, `${def.slug} unit ids`).toBe(ids.length);
    }
  });

  it("offers positive, ascending step sizes", () => {
    for (const def of MEASUREMENT_DEFS) {
      expect(def.steps.length, `${def.slug} steps`).toBeGreaterThan(0);
      expect(
        def.steps.every((s) => s > 0),
        `${def.slug} steps positive`,
      ).toBe(true);
      expect(
        [...def.steps].sort((a, b) => a - b),
        `${def.slug} steps sorted`,
      ).toEqual(def.steps);
    }
  });
});
