import { useLiveQuery } from "@tanstack/react-db";
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";

import { EventEditorPanel, type EventEditorState } from "@/components/event/EventEditorPanel";
import { ThingEditorPanel, type ThingEditorState } from "@/components/thing/ThingEditorPanel";
import { TrackScreen } from "@/components/track/TrackScreen";
import { useCollections } from "@/db/provider";
import { newEvent, type Thing } from "@/db/schema";
import { deleteEvent, updateEvent } from "@/domain/events";
import { indexMeasurements, measurementHistory } from "@/domain/measurements";
import { createThing } from "@/domain/things";

export const Route = createFileRoute("/_tabs/")({ component: TrackRoute });

function TrackRoute() {
  const collections = useCollections();
  const [thingEditor, setThingEditor] = useState<ThingEditorState | null>(null);
  const [eventEditor, setEventEditor] = useState<EventEditorState | null>(null);

  const { data: events } = useLiveQuery((q) => q.from({ event: collections.events }));
  const { data: things } = useLiveQuery((q) => q.from({ thing: collections.things }));
  const { data: measurements } = useLiveQuery((q) =>
    q.from({ measurement: collections.measurements }),
  );
  const measurementById = useMemo(() => indexMeasurements(measurements), [measurements]);

  /**
   * Opens an unsaved entry for a thing, pre-filled the same way a tap would be
   * — last time's measurements, time set to now and editable. This is how you
   * record something you forgot to log at the time.
   */
  function backdate(thing: Thing) {
    const draft = newEvent({
      thingId: thing.id,
      measurements: thing.measurements.flatMap((ref) => {
        const last = measurementHistory(collections, thing.id, ref.measurementId)[0];
        return last === undefined ? [] : [{ measurementId: ref.measurementId, value: last }];
      }),
    });
    setEventEditor({ mode: "create", event: draft, thing });
  }

  function openEvent(eventId: string) {
    const event = events.find((candidate) => candidate.id === eventId);
    if (!event) return;
    setEventEditor({
      mode: "edit",
      event,
      thing: things.find((thing) => thing.id === event.thingId),
    });
  }

  return (
    <>
      <TrackScreen
        onBackdateThing={backdate}
        onEditEvent={openEvent}
        onCreateThing={(title) => setThingEditor({ mode: "create", title })}
      />

      {/* Only creation lives here — editing a thing belongs in Manage → Things,
          which frees long-press on Track for backdating an entry. */}
      <ThingEditorPanel
        state={thingEditor}
        onClose={() => setThingEditor(null)}
        onSave={(draft) => {
          createThing(collections, draft);
          setThingEditor(null);
        }}
      />

      <EventEditorPanel
        state={eventEditor}
        measurementById={measurementById}
        onClose={() => setEventEditor(null)}
        onSave={(patch) => {
          if (!eventEditor) return;
          if (eventEditor.mode === "create") {
            collections.events.insert({
              ...eventEditor.event,
              actualAt: patch.actualAt,
              measurements: patch.measurements,
              ...(patch.notes.trim() ? { notes: patch.notes } : {}),
            });
          } else {
            updateEvent(collections, eventEditor.event.id, patch);
          }
          setEventEditor(null);
        }}
        onDelete={() => {
          if (eventEditor?.mode === "edit") deleteEvent(collections, eventEditor.event.id);
          setEventEditor(null);
        }}
      />
    </>
  );
}
