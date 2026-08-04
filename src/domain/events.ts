import type { AppCollectionsCtx } from "@/db/collections";
import { newEvent, type TrackedEvent } from "@/db/schema";

/**
 * Records that a thing happened. `actualAt` defaults to now and stays editable;
 * `recordedAt` never changes, so the audit trail survives any later correction.
 */
export function logEvent(
  collections: AppCollectionsCtx,
  thingId: string,
  options: { at?: number; durationMs?: number } = {},
): TrackedEvent {
  const at = options.at ?? Date.now();
  const event = newEvent({
    thingId,
    recordedAt: at,
    actualAt: at,
    durationMs: options.durationMs,
  });
  collections.events.insert(event);
  return event;
}

/** Past durations for a thing, newest first — feeds the duration sheet. */
export function durationHistory(collections: AppCollectionsCtx, thingId: string): number[] {
  return collections.events.toArray
    .filter((event) => event.thingId === thingId && event.durationMs !== undefined)
    .sort((a, b) => b.actualAt - a.actualAt)
    .map((event) => event.durationMs!)
    .filter((ms) => ms > 0);
}

export function updateEvent(
  collections: AppCollectionsCtx,
  id: string,
  patch: Partial<Pick<TrackedEvent, "actualAt" | "notes" | "durationMs">>,
): void {
  collections.events.update(id, (draft) => {
    if (patch.actualAt !== undefined) draft.actualAt = patch.actualAt;
    if (patch.durationMs !== undefined) {
      if (patch.durationMs > 0) draft.durationMs = patch.durationMs;
      else delete draft.durationMs;
    }
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
