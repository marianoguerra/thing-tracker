import { useLiveQuery } from "@tanstack/react-db";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { z } from "zod";

import { EventEditorDrawer } from "@/components/event/EventEditorDrawer";
import { InsightsScreen } from "@/components/insights/InsightsScreen";
import { useCollections } from "@/db/provider";
import { GRANULARITIES } from "@/domain/buckets";
import { deleteEvent, updateEvent } from "@/domain/events";

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
  const [editingEventId, setEditingEventId] = useState<string | null>(null);

  const { data: events } = useLiveQuery((q) => q.from({ event: collections.events }));
  const { data: things } = useLiveQuery((q) => q.from({ thing: collections.things }));

  const editingEvent = useMemo(
    () => events.find((event) => event.id === editingEventId) ?? null,
    [events, editingEventId],
  );
  const editingThing = useMemo(
    () => things.find((thing) => thing.id === editingEvent?.thingId),
    [things, editingEvent],
  );

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
        onEditEvent={setEditingEventId}
      />

      <EventEditorDrawer
        event={editingEvent}
        thing={editingThing}
        onClose={() => setEditingEventId(null)}
        onSave={(patch) => {
          if (editingEventId) updateEvent(collections, editingEventId, patch);
          setEditingEventId(null);
        }}
        onDelete={() => {
          if (editingEventId) deleteEvent(collections, editingEventId);
          setEditingEventId(null);
        }}
      />
    </>
  );
}
