import { normalize, terms } from "@/lib/text";
import { EMOJI_PALETTE, type EmojiEntry } from "./palette";

type Indexed = EmojiEntry & { haystack: string; normalizedName: string };

/** Built once at module load; the palette is static. */
const INDEX: Indexed[] = EMOJI_PALETTE.map((entry) => ({
  ...entry,
  normalizedName: normalize(entry.name),
  haystack: normalize([entry.name, entry.category, ...entry.keywords].join(" ")),
}));

/**
 * Ranks by how directly the query names the emoji: a name that starts with the
 * query beats one that merely contains it, which beats a keyword-only hit.
 * Every term must match somewhere, so "green tea" narrows rather than widens.
 */
export function searchEmoji(query: string): EmojiEntry[] {
  const parts = terms(query);
  if (parts.length === 0) return EMOJI_PALETTE;

  const scored: { entry: Indexed; score: number }[] = [];

  for (const entry of INDEX) {
    if (!parts.every((part) => entry.haystack.includes(part))) continue;

    const first = parts[0]!;
    let score = 0;
    if (entry.normalizedName === first) score = 4;
    else if (entry.normalizedName.startsWith(first)) score = 3;
    else if (entry.normalizedName.includes(first)) score = 2;
    else score = 1;

    scored.push({ entry, score });
  }

  return scored
    .sort((a, b) => b.score - a.score || a.entry.name.localeCompare(b.entry.name))
    .map(({ entry }) => entry);
}
