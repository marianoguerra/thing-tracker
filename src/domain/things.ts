import type { AppCollectionsCtx } from "@/db/collections";
import { newThing, type Thing } from "@/db/schema";
import type { DurationUnit } from "@/lib/duration";

export type ThingDraft = {
  emoji: string;
  title: string;
  description?: string;
  color?: string;
  duration?: { defaultUnit: DurationUnit };
};

export function createThing(collections: AppCollectionsCtx, draft: ThingDraft): Thing {
  const thing = newThing(draft);
  collections.things.insert(thing);
  return thing;
}

export function updateThing(
  collections: AppCollectionsCtx,
  id: string,
  patch: Partial<ThingDraft> & { archived?: boolean; duration?: ThingDraft["duration"] },
  // Explicit, because `duration: undefined` in a partial is ambiguous between
  // "leave it alone" and "turn duration tracking off".
  options: { clearDuration?: boolean } = {},
): void {
  collections.things.update(id, (draft) => {
    if (patch.emoji !== undefined) draft.emoji = patch.emoji;
    if (patch.title !== undefined) draft.title = patch.title;
    if (patch.archived !== undefined) draft.archived = patch.archived;
    if (patch.duration !== undefined) draft.duration = patch.duration;
    else if (options.clearDuration) delete draft.duration;
    assignOptional(draft, "description", patch.description);
    assignOptional(draft, "color", patch.color);
    draft.updatedAt = Date.now();
  });
}

/**
 * Deletes a thing, its events, and its membership in every group.
 *
 * Membership lives on group documents, so nothing else would clean it up —
 * leaving stale ids behind would silently shrink a shared group pack on export.
 */
export function deleteThing(collections: AppCollectionsCtx, id: string): void {
  for (const event of collections.events.toArray.filter((e) => e.thingId === id)) {
    collections.events.delete(event.id);
  }
  for (const group of collections.groups.toArray) {
    if (!group.thingIds.includes(id)) continue;
    collections.groups.update(group.id, (draft) => {
      draft.thingIds = draft.thingIds.filter((thingId) => thingId !== id);
      draft.updatedAt = Date.now();
    });
  }
  collections.things.delete(id);
}

function assignOptional<T extends Record<string, unknown>, K extends keyof T & string>(
  draft: T,
  key: K,
  value: string | undefined,
): void {
  if (value === undefined) return;
  if (value.trim()) (draft as Record<string, unknown>)[key] = value;
  else delete (draft as Record<string, unknown>)[key];
}
