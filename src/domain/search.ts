import type { Thing } from "@/db/schema";
import { normalize, terms } from "@/lib/text";

/**
 * Scores a thing against a query. 0 means no match.
 *
 * The emoji is matched as a literal too, so pasting ☕ finds Coffee — with an
 * emoji-first UI that is a natural thing to try, and it costs one comparison.
 */
export function scoreThing(thing: Thing, parts: readonly string[], rawQuery: string): number {
  if (parts.length === 0) return 1;

  const title = normalize(thing.title);
  const description = normalize(thing.description ?? "");
  const trimmedRaw = rawQuery.trim();

  if (trimmedRaw && thing.emoji === trimmedRaw) return 100;

  let score = 0;
  for (const part of parts) {
    if (title === part) score += 40;
    else if (title.startsWith(part)) score += 25;
    else if (title.includes(part)) score += 12;
    else if (description.includes(part)) score += 4;
    else return 0; // every term must match somewhere
  }
  return score;
}

/** Filters and ranks by relevance; ties keep the caller's incoming order. */
export function filterThings(things: readonly Thing[], query: string): Thing[] {
  const parts = terms(query);
  if (parts.length === 0) return [...things];

  const scored = things
    .map((thing, index) => ({ thing, index, score: scoreThing(thing, parts, query) }))
    .filter((row) => row.score > 0);

  scored.sort((a, b) => b.score - a.score || a.index - b.index);
  return scored.map((row) => row.thing);
}
