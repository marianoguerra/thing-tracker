import type { AppCollectionsCtx } from "@/db/collections";
import { newEvent, type TrackedEvent } from "@/db/schema";

/**
 * Records that a thing happened. `actualAt` defaults to now and stays editable;
 * `recordedAt` never changes, so the audit trail survives any later correction.
 */
export function logEvent(
  collections: AppCollectionsCtx,
  thingId: string,
  at: number = Date.now(),
): TrackedEvent {
  const event = newEvent({ thingId, recordedAt: at, actualAt: at });
  collections.events.insert(event);
  return event;
}

export function updateEvent(
  collections: AppCollectionsCtx,
  id: string,
  patch: Partial<Pick<TrackedEvent, "actualAt" | "notes">>,
): void {
  collections.events.update(id, (draft) => {
    if (patch.actualAt !== undefined) draft.actualAt = patch.actualAt;
    if (patch.notes !== undefined) {
      // An empty notes field means "no notes", not an empty string, so the
      // optional property is removed rather than blanked.
      if (patch.notes.trim()) draft.notes = patch.notes;
      else delete draft.notes;
    }
  });
}

export function deleteEvent(collections: AppCollectionsCtx, id: string): void {
  collections.events.delete(id);
}
