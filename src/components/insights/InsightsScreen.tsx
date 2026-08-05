import { useLiveQuery } from "@tanstack/react-db";
import { ListIcon } from "lucide-react";
import { useMemo, useState } from "react";

import { useCollections } from "@/db/provider";
import type { Thing, TrackedEvent } from "@/db/schema";
import { bucketEvents, withGaps, type Bucket, type Granularity } from "@/domain/buckets";
import { groupsByThing } from "@/domain/grouping";
import { indexMeasurements } from "@/domain/measurements";
import { BucketRow, formatBucketLabel } from "./BucketRow";
import { GranularityToggle } from "./GranularityToggle";
import { EventSheet } from "./EventSheet";

type Selection = { thingId: string | null; bucket: Bucket | null };

/** How many entries the flat list renders before asking you to narrow down. */
const ALL_LIMIT = 200;

type Props = {
  granularity: Granularity;
  onGranularityChange: (next: Granularity) => void;
  groupId: string | null;
  onGroupChange: (next: string | null) => void;
  onEditEvent: (eventId: string) => void;
};

export function InsightsScreen({
  granularity,
  onGranularityChange,
  groupId,
  onGroupChange,
  onEditEvent,
}: Props) {
  const collections = useCollections();
  const [selection, setSelection] = useState<Selection>({ thingId: null, bucket: null });
  const [showAll, setShowAll] = useState(false);

  const { data: events } = useLiveQuery((q) => q.from({ event: collections.events }));
  const { data: things } = useLiveQuery((q) => q.from({ thing: collections.things }));
  const { data: groups } = useLiveQuery((q) => q.from({ group: collections.groups }));
  const { data: measurementRows } = useLiveQuery((q) =>
    q.from({ measurement: collections.measurements }),
  );
  const measurementById = useMemo(() => indexMeasurements(measurementRows), [measurementRows]);

  const thingById = useMemo(() => new Map(things.map((t) => [t.id, t])), [things]);
  const now = useMemo(() => Date.now(), []);

  const visibleEvents = useMemo(() => {
    if (!groupId) return events;
    const group = groups.find((g) => g.id === groupId);
    if (!group) return events;
    const member = new Set(group.thingIds);
    return events.filter((event) => member.has(event.thingId));
  }, [events, groups, groupId]);

  const rows = useMemo(() => {
    const buckets = bucketEvents(visibleEvents, granularity);
    // Runs of empty days are only worth collapsing at day granularity; weeks
    // and months are sparse enough that the gaps read fine on their own.
    return granularity === "day"
      ? withGaps(buckets)
      : buckets.map((bucket) => ({ kind: "bucket" as const, bucket }));
  }, [visibleEvents, granularity]);

  const selectedEvents = useMemo<TrackedEvent[]>(() => {
    const { thingId, bucket } = selection;
    if (!thingId || !bucket) return [];
    const keys = new Set(bucket.chips.map((c) => c.thingId));
    if (!keys.has(thingId)) return [];
    const nextBucketStart = bucketEndExclusive(bucket, granularity);
    return visibleEvents
      .filter(
        (event) =>
          event.thingId === thingId &&
          event.actualAt >= bucket.start &&
          event.actualAt < nextBucketStart,
      )
      .sort((a, b) => b.actualAt - a.actualAt);
  }, [selection, visibleEvents, granularity]);

  const allEntries = useMemo(
    () => [...visibleEvents].sort((a, b) => b.actualAt - a.actualAt).slice(0, ALL_LIMIT),
    [visibleEvents],
  );

  const selectedThing: Thing | undefined = selection.thingId
    ? thingById.get(selection.thingId)
    : undefined;

  const usedGroupIds = useMemo(() => {
    const byThing = groupsByThing(groups);
    const ids = new Set<string>();
    for (const thing of things) for (const g of byThing.get(thing.id) ?? []) ids.add(g.id);
    return ids;
  }, [groups, things]);

  return (
    <>
      <div className="bg-background/85 border-border sticky top-0 z-20 space-y-2 border-b px-4 pt-[calc(env(safe-area-inset-top,0px)+0.625rem)] pb-2.5 backdrop-blur-lg">
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <GranularityToggle value={granularity} onChange={onGranularityChange} />
          </div>
          {/* The plain chronological view. Without it, reaching an entry means
              guessing which day and which emoji it lives under. */}
          <button
            type="button"
            onClick={() => setShowAll(true)}
            aria-label="All entries"
            title="All entries"
            className="border-border text-muted-foreground flex size-9 shrink-0 items-center justify-center rounded-md border"
          >
            <ListIcon className="size-4" />
          </button>
        </div>
        {usedGroupIds.size > 0 && (
          <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1">
            <FilterChip active={groupId === null} onClick={() => onGroupChange(null)}>
              All
            </FilterChip>
            {groups
              .filter((group) => usedGroupIds.has(group.id))
              .sort((a, b) => a.sortOrder - b.sortOrder)
              .map((group) => (
                <FilterChip
                  key={group.id}
                  active={groupId === group.id}
                  onClick={() => onGroupChange(group.id === groupId ? null : group.id)}
                >
                  {group.title}
                </FilterChip>
              ))}
          </div>
        )}
      </div>

      {rows.length === 0 ? (
        <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
          <div className="text-4xl" aria-hidden>
            🗓️
          </div>
          <p className="text-muted-foreground text-sm">
            Nothing logged yet. Entries show up here grouped by day, week or month.
          </p>
        </div>
      ) : (
        <div>
          {rows.map((row) =>
            row.kind === "bucket" ? (
              <BucketRow
                key={row.bucket.key}
                bucket={row.bucket}
                granularity={granularity}
                now={now}
                thingById={thingById}
                onSelect={(thingId, bucket) => setSelection({ thingId, bucket })}
              />
            ) : (
              <p
                key={`gap-${String(row.from)}`}
                className="text-muted-foreground/60 px-4 py-2 text-center text-xs"
              >
                · {row.days} quiet {row.days === 1 ? "day" : "days"} ·
              </p>
            ),
          )}
        </div>
      )}

      <EventSheet
        open={showAll}
        title={`${String(Math.min(visibleEvents.length, ALL_LIMIT))} of ${String(visibleEvents.length)}, newest first`}
        thing={undefined}
        thingById={thingById}
        events={allEntries}
        measurementById={measurementById}
        onClose={() => setShowAll(false)}
        onEdit={(eventId) => {
          setShowAll(false);
          onEditEvent(eventId);
        }}
        onDelete={(eventId) => {
          collections.events.delete(eventId);
        }}
      />

      <EventSheet
        open={selection.thingId !== null}
        title={selection.bucket ? formatBucketLabel(selection.bucket.start, granularity, now) : ""}
        thing={selectedThing}
        events={selectedEvents}
        measurementById={measurementById}
        onClose={() => setSelection({ thingId: null, bucket: null })}
        onEdit={(eventId) => {
          setSelection({ thingId: null, bucket: null });
          onEditEvent(eventId);
        }}
        onDelete={(eventId) => {
          collections.events.delete(eventId);
        }}
      />
    </>
  );
}

function bucketEndExclusive(bucket: Bucket, granularity: Granularity): number {
  const d = new Date(bucket.start);
  // Calendar arithmetic rather than millisecond addition, so DST transitions
  // and 28-to-31 day months land on the right boundary.
  if (granularity === "day") d.setDate(d.getDate() + 1);
  else if (granularity === "week") d.setDate(d.getDate() + 7);
  else d.setMonth(d.getMonth() + 1);
  return d.getTime();
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={
        active
          ? "bg-primary text-primary-foreground shrink-0 rounded-full border border-transparent px-3 py-1 text-xs font-medium whitespace-nowrap"
          : "border-border text-muted-foreground shrink-0 rounded-full border px-3 py-1 text-xs font-medium whitespace-nowrap"
      }
    >
      {children}
    </button>
  );
}
