import type { AppCollectionsCtx } from "@/db/collections";
import { newEvent, type EventMeasurement, type TrackedEvent } from "@/db/schema";

/**
 * Records that a thing happened. `actualAt` defaults to now and stays editable;
 * `recordedAt` never changes, so the audit trail survives any later correction.
 */
export function logEvent(
  collections: AppCollectionsCtx,
  thingId: string,
  options: { at?: number; measurements?: EventMeasurement[] } = {},
): TrackedEvent {
  const at = options.at ?? Date.now();
  const event = newEvent({
    thingId,
    recordedAt: at,
    actualAt: at,
    measurements: options.measurements ?? [],
  });
  collections.events.insert(event);
  return event;
}

export function updateEvent(
  collections: AppCollectionsCtx,
  id: string,
  patch: Partial<Pick<TrackedEvent, "actualAt" | "notes" | "measurements">>,
): void {
  collections.events.update(id, (draft) => {
    if (patch.actualAt !== undefined) draft.actualAt = patch.actualAt;
    // A zero means "not measured" and is dropped rather than stored, so an
    // emptied field doesn't leave a misleading 0 in the data.
    if (patch.measurements !== undefined) {
      draft.measurements = patch.measurements.filter((m) => m.value > 0);
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
