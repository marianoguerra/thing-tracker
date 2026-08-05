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

/**
 * True when every term in the query appears somewhere in the given fields.
 *
 * Requiring all terms means a second word narrows rather than widens, which is
 * what people expect from a filter box. Undefined fields are skipped so
 * callers can pass optional values directly.
 */
export function matchesQuery(query: string, ...fields: (string | undefined)[]): boolean {
  const parts = terms(query);
  if (parts.length === 0) return true;
  const haystack = normalize(fields.filter(Boolean).join(" "));
  return parts.every((part) => haystack.includes(part));
}
