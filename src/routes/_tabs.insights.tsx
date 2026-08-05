import { useLiveQuery } from "@tanstack/react-db";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { z } from "zod";

import { EventEditorDrawer, type EventEditorState } from "@/components/event/EventEditorDrawer";
import { InsightsScreen } from "@/components/insights/InsightsScreen";
import { useCollections } from "@/db/provider";
import { GRANULARITIES } from "@/domain/buckets";
import { deleteEvent, updateEvent } from "@/domain/events";
import { indexMeasurements } from "@/domain/measurements";

// In the URL so a view is linkable and survives reload — and `.catch()` so a
// hand-edited or stale link degrades to the default instead of erroring.
const searchSchema = z.object({
  by: z.enum(GRANULARITIES).default("day").catch("day"),
  group: z.string().max(36).optional().catch(undefined),
});

export const Route = createFileRoute("/_tabs/insights")({
  validateSearch: searchSchema,
  component: InsightsRoute,
});

function InsightsRoute() {
  const { by, group } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const collections = useCollections();
  const [eventEditor, setEventEditor] = useState<EventEditorState | null>(null);

  const { data: events } = useLiveQuery((q) => q.from({ event: collections.events }));
  const { data: things } = useLiveQuery((q) => q.from({ thing: collections.things }));
  const { data: measurements } = useLiveQuery((q) =>
    q.from({ measurement: collections.measurements }),
  );
  const measurementById = useMemo(() => indexMeasurements(measurements), [measurements]);

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
      <InsightsScreen
        granularity={by}
        onGranularityChange={(next) => {
          void navigate({ search: (prev) => ({ ...prev, by: next }), replace: true });
        }}
        groupId={group ?? null}
        onGroupChange={(next) => {
          void navigate({
            search: (prev) => ({ ...prev, group: next ?? undefined }),
            replace: true,
          });
        }}
        onEditEvent={openEvent}
      />

      <EventEditorDrawer
        state={eventEditor}
        measurementById={measurementById}
        onClose={() => setEventEditor(null)}
        onSave={(patch) => {
          if (eventEditor) updateEvent(collections, eventEditor.event.id, patch);
          setEventEditor(null);
        }}
        onDelete={() => {
          if (eventEditor) deleteEvent(collections, eventEditor.event.id);
          setEventEditor(null);
        }}
      />
    </>
  );
}
