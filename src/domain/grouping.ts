import type { Group, Thing } from "@/db/schema";

export const UNGROUPED_ID = "__ungrouped__";

export type TagRow = {
  id: string;
  title: string;
  emoji?: string;
  color?: string;
  things: Thing[];
  /** True for the synthetic catch-all row, which has no group document. */
  synthetic: boolean;
};

/**
 * Builds the Track screen's rows: one per group, in `sortOrder`, plus a
 * synthetic "Ungrouped" row for things no group claims.
 *
 * Groups behave as tags, so a thing in three groups genuinely appears in three
 * rows — that is the feature, not duplication to be deduped away.
 */
export function buildTagRows(
  groups: readonly Group[],
  things: readonly Thing[],
  options: { sortThings?: (things: Thing[]) => Thing[] } = {},
): TagRow[] {
  const sort = options.sortThings ?? ((list: Thing[]) => list);
  const byId = new Map(things.map((thing) => [thing.id, thing]));
  const claimed = new Set<string>();

  const rows: TagRow[] = [];

  for (const group of [...groups].sort(
    (a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title),
  )) {
    const members: Thing[] = [];
    for (const thingId of group.thingIds) {
      const thing = byId.get(thingId);
      // A missing id is normal, not corruption: the thing may be archived,
      // filtered out by search, or deleted while the group still lists it.
      if (!thing) continue;
      members.push(thing);
      claimed.add(thing.id);
    }
    if (members.length === 0) continue;
    rows.push({
      id: group.id,
      title: group.title,
      emoji: group.emoji,
      color: group.color,
      things: sort(members),
      synthetic: false,
    });
  }

  const orphans = things.filter((thing) => !claimed.has(thing.id));
  if (orphans.length > 0) {
    rows.push({
      id: UNGROUPED_ID,
      title: "Ungrouped",
      things: sort(orphans),
      synthetic: true,
    });
  }

  return rows;
}

/** Reverse index: which groups is each thing tagged with. */
export function groupsByThing(groups: readonly Group[]): Map<string, Group[]> {
  const index = new Map<string, Group[]>();
  for (const group of groups) {
    for (const thingId of group.thingIds) {
      const list = index.get(thingId);
      if (list) list.push(group);
      else index.set(thingId, [group]);
    }
  }
  return index;
}
