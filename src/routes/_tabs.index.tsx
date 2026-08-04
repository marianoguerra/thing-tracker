import { useLiveQuery } from "@tanstack/react-db";
import { createFileRoute } from "@tanstack/react-router";

import { useCollections } from "@/db/provider";
import { newEvent, newGroup, newThing } from "@/db/schema";

export const Route = createFileRoute("/_tabs/")({ component: TrackRoute });

// TEMPORARY: a seed/dump panel to prove the data layer round-trips. Replaced by
// the real Track screen in the next step.
function TrackRoute() {
  const { things, groups, events, usageByThing } = useCollections();

  const { data: thingRows } = useLiveQuery((q) => q.from({ thing: things }));
  const { data: groupRows } = useLiveQuery((q) => q.from({ group: groups }));
  const { data: eventRows } = useLiveQuery((q) => q.from({ event: events }));
  const { data: usageRows } = useLiveQuery((q) => q.from({ usage: usageByThing }));

  function seed() {
    const coffee = newThing({ emoji: "☕", title: "Coffee" });
    const water = newThing({ emoji: "💧", title: "Water" });
    const run = newThing({ emoji: "🏃", title: "Run" });
    things.insert([coffee, water, run]);

    groups.insert([
      newGroup({ title: "Drinks", sortOrder: 0, thingIds: [coffee.id, water.id] }),
      newGroup({ title: "Body", sortOrder: 1, thingIds: [run.id, water.id] }),
    ]);

    const now = Date.now();
    events.insert([
      newEvent({ thingId: coffee.id, recordedAt: now - 3_600_000 }),
      newEvent({ thingId: coffee.id, recordedAt: now - 600_000 }),
      newEvent({ thingId: water.id, recordedAt: now - 60_000 }),
    ]);
  }

  return (
    <div className="space-y-4 p-4">
      <h1 className="text-xl font-semibold tracking-tight">Track</h1>

      <div className="flex gap-2">
        <button
          type="button"
          className="bg-primary text-primary-foreground h-9 rounded-md px-3 text-sm font-medium"
          onClick={seed}
        >
          Seed
        </button>
        <button
          type="button"
          className="border-border h-9 rounded-md border px-3 text-sm font-medium"
          onClick={() => {
            for (const row of eventRows) events.delete(row.id);
            for (const row of groupRows) groups.delete(row.id);
            for (const row of thingRows) things.delete(row.id);
          }}
        >
          Clear
        </button>
      </div>

      <p className="text-muted-foreground text-sm">
        {thingRows.length} things · {groupRows.length} groups · {eventRows.length} events
      </p>

      <ul className="space-y-1 text-sm">
        {thingRows.map((thing) => {
          const usage = usageRows.find((u) => u.thingId === thing.id);
          return (
            <li key={thing.id} className="flex items-center gap-2">
              <span className="emoji text-lg">{thing.emoji}</span>
              <span className="font-medium">{thing.title}</span>
              <span className="text-muted-foreground">
                {usage
                  ? `${usage.total}× · last ${new Date(usage.lastAt).toLocaleTimeString()}`
                  : "never"}
              </span>
            </li>
          );
        })}
      </ul>

      <ul className="text-muted-foreground space-y-1 text-sm">
        {groupRows.map((group) => (
          <li key={group.id}>
            {group.title} → {group.thingIds.length} things
          </li>
        ))}
      </ul>
    </div>
  );
}
