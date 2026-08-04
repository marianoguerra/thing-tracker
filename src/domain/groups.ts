import type { AppDatabase } from "@/db/database";
import type { AppCollectionsCtx } from "@/db/collections";
import { newGroup, type Group } from "@/db/schema";

export type GroupDraft = {
  title: string;
  description?: string;
  emoji?: string;
  color?: string;
};

export function createGroup(collections: AppCollectionsCtx, draft: GroupDraft): Group {
  const highest = collections.groups.toArray.reduce((max, g) => Math.max(max, g.sortOrder), -1);
  const group = newGroup({ ...draft, sortOrder: highest + 1 });
  collections.groups.insert(group);
  return group;
}

export function updateGroup(
  collections: AppCollectionsCtx,
  id: string,
  patch: Partial<GroupDraft> & { sortOrder?: number },
): void {
  collections.groups.update(id, (draft) => {
    if (patch.title !== undefined) draft.title = patch.title;
    if (patch.sortOrder !== undefined) draft.sortOrder = patch.sortOrder;
    for (const key of ["description", "emoji", "color"] as const) {
      const value = patch[key];
      if (value === undefined) continue;
      if (value.trim()) draft[key] = value;
      else delete draft[key];
    }
    draft.updatedAt = Date.now();
  });
}

export function deleteGroup(collections: AppCollectionsCtx, id: string): void {
  // Only the tag goes away. Things are standalone and outlive any grouping.
  collections.groups.delete(id);
}

/**
 * Adds or removes things from a group's membership array.
 *
 * Goes through RxDB's `incrementalModify` rather than a plain collection
 * update: the whole array is rewritten on every change, so two tabs tagging
 * different things into the same group would otherwise lose one of the writes.
 * `incrementalModify` re-runs the mutation on a revision conflict.
 */
export async function setGroupMembership(
  db: AppDatabase,
  groupId: string,
  changes: { add?: readonly string[]; remove?: readonly string[] },
): Promise<void> {
  const doc = await db.groups.findOne(groupId).exec();
  if (!doc) return;

  await doc.incrementalModify((data) => {
    const next = new Set(data.thingIds);
    for (const id of changes.add ?? []) next.add(id);
    for (const id of changes.remove ?? []) next.delete(id);
    return { ...data, thingIds: [...next], updatedAt: Date.now() };
  });
}

export function toggleThingInGroup(db: AppDatabase, group: Group, thingId: string): Promise<void> {
  return group.thingIds.includes(thingId)
    ? setGroupMembership(db, group.id, { remove: [thingId] })
    : setGroupMembership(db, group.id, { add: [thingId] });
}
