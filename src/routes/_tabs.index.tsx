import { useLiveQuery } from "@tanstack/react-db";
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";

import { EventEditorDrawer } from "@/components/event/EventEditorDrawer";
import { ThingEditorDrawer, type ThingEditorState } from "@/components/thing/ThingEditorDrawer";
import { TrackScreen } from "@/components/track/TrackScreen";
import { useCollections } from "@/db/provider";
import type { Thing } from "@/db/schema";
import { deleteEvent, updateEvent } from "@/domain/events";
import { groupsByThing } from "@/domain/grouping";
import { createThing, deleteThing, updateThing } from "@/domain/things";

export const Route = createFileRoute("/_tabs/")({ component: TrackRoute });

function TrackRoute() {
  const collections = useCollections();
  const [thingEditor, setThingEditor] = useState<ThingEditorState | null>(null);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);

  const { data: events } = useLiveQuery((q) => q.from({ event: collections.events }));
  const { data: things } = useLiveQuery((q) => q.from({ thing: collections.things }));
  const { data: groups } = useLiveQuery((q) => q.from({ group: collections.groups }));

  const editingEvent = useMemo(
    () => events.find((event) => event.id === editingEventId) ?? null,
    [events, editingEventId],
  );
  const editingThing = useMemo(
    () => things.find((thing) => thing.id === editingEvent?.thingId),
    [things, editingEvent],
  );

  /**
   * Emoji already in use by things that share a group with the one being
   * edited. Only same-group clashes matter — two identical emoji in different
   * sections are never on screen together.
   */
  const siblingEmoji = useMemo(() => {
    if (thingEditor?.mode !== "edit") return undefined;
    const target = thingEditor.thing;
    const byThing = groupsByThing(groups);
    const sharedGroupIds = new Set((byThing.get(target.id) ?? []).map((g) => g.id));
    const map = new Map<string, string>();
    for (const group of groups) {
      if (!sharedGroupIds.has(group.id)) continue;
      for (const thingId of group.thingIds) {
        if (thingId === target.id) continue;
        const sibling = things.find((t) => t.id === thingId);
        if (sibling) map.set(sibling.emoji, sibling.title);
      }
    }
    return map;
  }, [thingEditor, groups, things]);

  return (
    <>
      <TrackScreen
        onInspectThing={(thing: Thing) => setThingEditor({ mode: "edit", thing })}
        onEditEvent={setEditingEventId}
        onCreateThing={(title) => setThingEditor({ mode: "create", title })}
      />

      <ThingEditorDrawer
        state={thingEditor}
        siblingEmoji={siblingEmoji}
        onClose={() => setThingEditor(null)}
        onSave={(draft) => {
          if (thingEditor?.mode === "edit") {
            updateThing(collections, thingEditor.thing.id, draft, {
              clearDuration: draft.duration === undefined,
            });
          } else {
            createThing(collections, draft);
          }
          setThingEditor(null);
        }}
        onDelete={(thing) => {
          deleteThing(collections, thing.id);
          setThingEditor(null);
        }}
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
