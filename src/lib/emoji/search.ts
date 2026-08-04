import { normalize, terms } from "@/lib/text";
import { CATALOG, type CatalogEntry } from "./catalog";

type Indexed = CatalogEntry & { haystack: string; normalizedName: string };

/** Built once at module load; the catalog is static. */
const INDEX: Indexed[] = CATALOG.map((entry) => ({
  ...entry,
  normalizedName: normalize(entry.name),
  haystack: normalize([entry.name, entry.category, ...entry.keywords].join(" ")),
}));

/**
 * Ranks by how directly the query names the emoji: an exact name beats a
 * prefix, which beats a substring, which beats a keyword-only hit. Every term
 * must match somewhere, so "green tea" narrows rather than widens.
 *
 * Curated entries get a small bump on ties. With 1870 candidates a query like
 * "water" matches a dozen things; the one a tracker actually wants should not
 * be buried behind "water buffalo".
 */
export function searchEmoji(query: string): CatalogEntry[] {
  const parts = terms(query);
  if (parts.length === 0) return CATALOG;

  const scored: { entry: Indexed; score: number }[] = [];

  for (const entry of INDEX) {
    if (!parts.every((part) => entry.haystack.includes(part))) continue;

    const first = parts[0]!;
    let score = 0;
    if (entry.normalizedName === first) score = 40;
    else if (entry.normalizedName.startsWith(first)) score = 30;
    else if (entry.normalizedName.includes(first)) score = 20;
    else score = 10;
    if (entry.common) score += 5;

    scored.push({ entry, score });
  }

  return scored
    .sort((a, b) => b.score - a.score || a.entry.name.localeCompare(b.entry.name))
    .map(({ entry }) => entry);
}
