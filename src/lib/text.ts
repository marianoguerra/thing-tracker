/**
 * Lowercases and strips diacritics, so "cafe" matches "Café" and "ecole"
 * matches "École". Anyone typing fast on a phone keyboard omits accents.
 */
export function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim();
}

/** Splits a query into non-empty normalized terms. */
export function terms(query: string): string[] {
  return normalize(query).split(/\s+/).filter(Boolean);
}
