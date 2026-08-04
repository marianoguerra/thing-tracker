import { useLiveQuery } from "@tanstack/react-db";
import { eq } from "@tanstack/db";
import { useDeferredValue, useMemo, useState } from "react";
import { toast } from "sonner";

import { MeasurementSheet, type MeasurementPrompt } from "@/components/measure/MeasurementSheet";
import { InstallHint } from "@/components/pwa/InstallHint";
import { StorageBanner } from "@/components/pwa/StorageBanner";
import type { Thing } from "@/db/schema";
import { useCollections } from "@/db/provider";
import { deleteEvent, logEvent } from "@/domain/events";
import { buildPrompts, indexMeasurements } from "@/domain/measurements";
import { buildTagRows } from "@/domain/grouping";
import { applyFrozenOrder, indexUsage } from "@/domain/ranking";
import { filterThings } from "@/domain/search";
import { useLocalStorageState } from "@/hooks/useLocalStorageState";
import { useSectionCollapse } from "@/hooks/useSectionCollapse";
import { formatMeasurement } from "@/lib/measure/format";
import { formatTime } from "@/lib/time";
import { EmptyState } from "./EmptyState";
import { TagRow } from "./TagRow";
import { Toolbar } from "./Toolbar";
import { useStableOrder } from "./useStableOrder";

const COMPACT_KEY = "tt.track.compact.v1";
const LONGPRESS_HINT_KEY = "tt.hints.longpress.v1";

type Props = {
  onInspectThing: (thing: Thing) => void;
  onEditEvent: (eventId: string) => void;
  onCreateThing: (title?: string) => void;
};

export function TrackScreen({ onInspectThing, onEditEvent, onCreateThing }: Props) {
  const collections = useCollections();
  const { things, groups, usageByThing } = collections;

  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [compact, setCompact] = useLocalStorageState<boolean>(COMPACT_KEY, false);
  const [hintShown, setHintShown] = useLocalStorageState<boolean>(LONGPRESS_HINT_KEY, false);

  // Three live queries, whatever the number of things.
  const { data: thingRows } = useLiveQuery((q) =>
    q.from({ thing: things }).where(({ thing }) => eq(thing.archived, false)),
  );
  const { data: groupRows } = useLiveQuery((q) => q.from({ group: groups }));
  const { data: usageRows } = useLiveQuery((q) => q.from({ usage: usageByThing }));
  const { data: measurementRows } = useLiveQuery((q) =>
    q.from({ measurement: collections.measurements }),
  );

  const usage = useMemo(() => indexUsage(usageRows), [usageRows]);
  const frozenOrder = useStableOrder(thingRows, usage);

  const searching = deferredQuery.trim().length > 0;

  const rows = useMemo(() => {
    const visible = searching ? filterThings(thingRows, deferredQuery) : thingRows;
    return buildTagRows(groupRows, visible, {
      // While searching, relevance order already ranks the results; outside of
      // search the frozen frequency order applies.
      sortThings: searching ? undefined : (list) => applyFrozenOrder(list, frozenOrder),
    });
  }, [thingRows, groupRows, deferredQuery, searching, frozenOrder]);

  const rowIds = useMemo(() => rows.map((row) => row.id), [rows]);
  const { isOpen, toggle, toggleAll, anyOpen } = useSectionCollapse(rowIds);

  const [measuring, setMeasuring] = useState<Thing | null>(null);
  const measurementById = useMemo(() => indexMeasurements(measurementRows), [measurementRows]);
  const prompts = useMemo<MeasurementPrompt[]>(
    () => (measuring ? buildPrompts(collections, measuring, measurementById) : []),
    [measuring, collections, measurementById],
  );

  /** Things that record measurements ask for them first; the rest are one tap. */
  function handleTap(thing: Thing) {
    if (thing.measurements.length > 0) setMeasuring(thing);
    else commitLog(thing);
  }

  function commitLog(thing: Thing, measurements?: { measurementId: string; value: number }[]) {
    const event = logEvent(collections, thing.id, { measurements });
    const toastId = toast(`${thing.emoji} ${thing.title}`, {
      description: (
        <span className="flex items-center gap-2">
          <span>
            {event.measurements.length > 0
              ? `${event.measurements
                  .map((m) => {
                    const measurement = measurementById.get(m.measurementId);
                    return measurement ? formatMeasurement(measurement, m.value) : String(m.value);
                  })
                  .join(" · ")} at ${formatTime(event.actualAt)}`
              : `Logged at ${formatTime(event.actualAt)}`}
          </span>
          {/*
            An explicit affordance rather than a tap-anywhere target: the toast
            already carries Undo, and a body that silently swallows taps is easy
            to hit by accident while aiming for it.
          */}
          <button
            type="button"
            className="underline underline-offset-2"
            onClick={() => {
              toast.dismiss(toastId);
              onEditEvent(event.id);
            }}
          >
            Edit
          </button>
        </span>
      ),
      action: {
        label: "Undo",
        onClick: () => {
          deleteEvent(collections, event.id);
        },
      },
    });

    if (!hintShown) {
      setHintShown(true);
      setTimeout(() => {
        toast("Tip", {
          description: "Press and hold a section header to collapse or expand everything.",
        });
      }, 1200);
    }
  }

  function handleToggleAll() {
    toggleAll();
  }

  if (thingRows.length === 0) {
    return <EmptyState onCreateThing={() => onCreateThing()} />;
  }

  return (
    <>
      <Toolbar
        query={query}
        onQueryChange={setQuery}
        compact={compact}
        onToggleCompact={() => setCompact((prev) => !prev)}
        anyOpen={anyOpen}
        onToggleAll={handleToggleAll}
      />

      {/*
        On Track rather than tucked into Manage → Data. Both are one-time,
        dismissible and only render when they apply — and a warning about
        losing your data is worthless where nobody looks.
      */}
      <StorageBanner />
      <InstallHint />

      {rows.length === 0 ? (
        <div className="space-y-3 px-4 py-10 text-center">
          <p className="text-muted-foreground text-sm">Nothing matches “{deferredQuery}”.</p>
          <button
            type="button"
            className="bg-primary text-primary-foreground h-9 rounded-md px-4 text-sm font-medium"
            onClick={() => {
              onCreateThing(query.trim());
            }}
          >
            Create “{query.trim()}”
          </button>
        </div>
      ) : (
        <div className="pb-4">
          {rows.map((row) => (
            <TagRow
              key={row.id}
              row={row}
              usage={usage}
              // A search that matched inside a collapsed section would
              // otherwise show a header with nothing under it.
              open={searching || isOpen(row.id)}
              compact={compact}
              onToggle={() => {
                if (!searching) toggle(row.id);
              }}
              onToggleAll={handleToggleAll}
              onLog={handleTap}
              onInspect={onInspectThing}
            />
          ))}
        </div>
      )}

      <MeasurementSheet
        thing={measuring}
        prompts={prompts}
        onCancel={() => setMeasuring(null)}
        onConfirm={(values) => {
          if (measuring) commitLog(measuring, values);
          setMeasuring(null);
        }}
      />
    </>
  );
}
