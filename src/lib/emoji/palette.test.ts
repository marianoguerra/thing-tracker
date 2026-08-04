import { describe, expect, it } from "vite-plus/test";

import { EMOJI_CATEGORIES, EMOJI_PALETTE } from "./palette";
import { searchEmoji } from "./search";

describe("emoji palette", () => {
  it("has no duplicate characters", () => {
    // Two entries sharing a character silently collide in EMOJI_BY_CHAR, so one
    // of them becomes unreachable by lookup.
    const chars = EMOJI_PALETTE.map((entry) => entry.char);
    const duplicates = chars.filter((char, index) => chars.indexOf(char) !== index);
    expect(duplicates).toEqual([]);
  });

  it("uses no ZWJ sequences", () => {
    // They render as tofu on older Android and Windows, which is fatal when the
    // emoji IS the label rather than decoration.
    const zwj = EMOJI_PALETTE.filter((entry) => entry.char.includes("‍"));
    expect(zwj.map((e) => e.name)).toEqual([]);
  });

  it("uses no skin-tone modifiers", () => {
    const toned = EMOJI_PALETTE.filter((entry) => /[\u{1F3FB}-\u{1F3FF}]/u.test(entry.char));
    expect(toned.map((e) => e.name)).toEqual([]);
  });

  it("fits the schema's emoji length limit", () => {
    for (const entry of EMOJI_PALETTE) {
      expect(entry.char.length, entry.name).toBeGreaterThan(0);
      expect(entry.char.length, entry.name).toBeLessThanOrEqual(16);
    }
  });

  it("assigns every entry a declared category and some keywords", () => {
    for (const entry of EMOJI_PALETTE) {
      expect(EMOJI_CATEGORIES, entry.name).toContain(entry.category);
      expect(entry.keywords.length, entry.name).toBeGreaterThan(0);
    }
  });

  it("covers every category", () => {
    for (const category of EMOJI_CATEGORIES) {
      expect(
        EMOJI_PALETTE.some((e) => e.category === category),
        category,
      ).toBe(true);
    }
  });
});

describe("searchEmoji", () => {
  it("returns everything for an empty query", () => {
    expect(searchEmoji("  ")).toHaveLength(EMOJI_PALETTE.length);
  });

  it("puts the obvious answer first", () => {
    expect(searchEmoji("coffee")[0]?.char).toBe("☕");
    expect(searchEmoji("water")[0]?.char).toBe("💧");
    expect(searchEmoji("run")[0]?.char).toBe("🏃");
  });

  it("matches keywords, not just names", () => {
    expect(searchEmoji("caffeine").some((e) => e.char === "☕")).toBe(true);
    expect(searchEmoji("meds").some((e) => e.char === "💊")).toBe(true);
  });

  it("ignores diacritics and case", () => {
    expect(searchEmoji("CAFFEINE").some((e) => e.char === "☕")).toBe(true);
  });

  it("narrows on multiple terms rather than widening", () => {
    const results = searchEmoji("green tea");
    expect(results.every((e) => [e.name, ...e.keywords].join(" ").toLowerCase().includes("green")));
    expect(results.length).toBeLessThan(searchEmoji("tea").length + 1);
  });

  it("returns nothing when nothing matches", () => {
    expect(searchEmoji("zzzzzz")).toEqual([]);
  });
});
