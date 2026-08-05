import { FULL_EMOJI, FULL_GROUPS } from "./full-data";
import { EMOJI_PALETTE } from "./palette";

export type CatalogEntry = {
  char: string;
  /** Curated name where we have one, otherwise Unicode's. */
  name: string;
  /** Extra search terms. Only curated entries carry these. */
  keywords: string[];
  /** Unicode's own top-level group. */
  category: string;
  /** In the curated set — surfaced first and shown under "Common". */
  common: boolean;
};

export const COMMON_CATEGORY = "Common";

/** "Common" first, then Unicode's groups in their canonical order. */
export const CATALOG_CATEGORIES: string[] = [COMMON_CATEGORY, ...FULL_GROUPS];

/**
 * An icon per category, the way every mobile keyboard labels these.
 *
 * Ten text labels cannot fit any phone width — they forced a horizontal
 * scroller that hid half the categories behind a drag. Ten emoji fit, and the
 * pictures are the same ones people already recognise from their keyboard. The
 * full name still goes on `aria-label` and `title`.
 */
export const CATEGORY_ICONS: Record<string, string> = {
  [COMMON_CATEGORY]: "⭐",
  "Smileys & Emotion": "😀",
  "People & Body": "👋",
  "Animals & Nature": "🐻",
  "Food & Drink": "🍔",
  "Travel & Places": "🚗",
  Activities: "⚽",
  Objects: "💡",
  Symbols: "🔣",
  Flags: "🏁",
};

const curatedByChar = new Map(EMOJI_PALETTE.map((entry) => [entry.char, entry]));

/**
 * Every emoji, with the curated set's better names and keywords layered on top.
 *
 * The full Unicode list alone searches badly for a tracker: 💊 is "pill", not
 * "meds"; 💧 is "droplet", not "hydration". So the curated entries keep their
 * own naming and are marked `common`, while everything else falls back to the
 * Unicode name — complete, without losing the vocabulary people actually type.
 */
export const CATALOG: CatalogEntry[] = FULL_EMOJI.map(([char, name, groupIndex]) => {
  const curated = curatedByChar.get(char);
  return {
    char,
    name: curated?.name ?? name,
    keywords: curated ? [...curated.keywords, name] : [],
    category: FULL_GROUPS[groupIndex] ?? "Symbols",
    common: curated !== undefined,
  };
});

const catalogChars = new Set(CATALOG.map((entry) => entry.char));

/**
 * A handful of curated entries use presentation variants (e.g. ⏸️ with U+FE0F)
 * that the Unicode list keys without. Appending them keeps the curated set
 * fully reachable rather than silently dropping a few.
 */
for (const entry of EMOJI_PALETTE) {
  if (catalogChars.has(entry.char)) continue;
  CATALOG.push({
    char: entry.char,
    name: entry.name,
    keywords: entry.keywords,
    category: "Symbols",
    common: true,
  });
}

export const CATALOG_BY_CHAR = new Map(CATALOG.map((entry) => [entry.char, entry]));

/**
 * "Common" in the curated order, everything else in Unicode's.
 *
 * The curated list is sequenced for a tracker — water, coffee, tea before
 * anything else — and inheriting Unicode order here would open the picker on a
 * wall of smileys, which is exactly the ordering the curation existed to avoid.
 */
const COMMON_ORDER = new Map(EMOJI_PALETTE.map((entry, index) => [entry.char, index]));

export function entriesForCategory(category: string): CatalogEntry[] {
  if (category !== COMMON_CATEGORY) {
    return CATALOG.filter((entry) => entry.category === category);
  }
  return CATALOG.filter((entry) => entry.common).sort(
    (a, b) => (COMMON_ORDER.get(a.char) ?? 0) - (COMMON_ORDER.get(b.char) ?? 0),
  );
}
