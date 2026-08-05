import { useLiveQuery } from "@tanstack/react-db";
import { useDeferredValue, useMemo, useState } from "react";

import { useCollections } from "@/db/provider";
import { matchesQuery } from "@/lib/text";
import { ManageSearch, NoMatches } from "./ManageSearch";

/**
 * The measurement registry.
 *
 * Read-only by design for now: every scale here has a fixed, shared id, which
 * is what lets two people's distances or weights be compared at all. Letting
 * anyone edit a factor would silently reinterpret data already recorded against
 * it — a custom-measurement flow needs its own ids and belongs in its own step.
 */
export function MeasurementsPanel() {
  const { measurements, things } = useCollections();
  const { data: rows } = useLiveQuery((q) => q.from({ measurement: measurements }));
  const { data: thingRows } = useLiveQuery((q) => q.from({ thing: things }));

  const usage = useMemo(() => {
    const counts = new Map<string, number>();
    for (const thing of thingRows) {
      for (const ref of thing.measurements) {
        counts.set(ref.measurementId, (counts.get(ref.measurementId) ?? 0) + 1);
      }
    }
    return counts;
  }, [thingRows]);

  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);

  const sorted = useMemo(
    () =>
      [...rows]
        // Unit labels and symbols are searchable too: looking for "lb" or
        // "miles" should find the scale that carries them.
        .filter((m) =>
          matchesQuery(
            deferredQuery,
            m.name,
            m.emoji,
            m.units.map((u) => `${u.label} ${u.symbol}`).join(" "),
          ),
        )
        .sort((a, b) => a.name.localeCompare(b.name)),
    [rows, deferredQuery],
  );

  return (
    <div className="space-y-3 p-4">
      <p className="text-muted-foreground text-sm">
        Quantities a thing can record. Metric and imperial units sit inside the same measurement, so
        values are stored once and everyone reads them in whichever unit they think in.
      </p>

      {rows.length > 0 && (
        <ManageSearch value={query} onChange={setQuery} placeholder="Search measurements…" />
      )}

      {sorted.length === 0 && deferredQuery.trim() && <NoMatches query={deferredQuery} />}

      <ul className="divide-border/60 divide-y">
        {sorted.map((measurement) => {
          const used = usage.get(measurement.id) ?? 0;
          return (
            <li key={measurement.id} className="py-2.5">
              <div className="flex items-center gap-2">
                {measurement.emoji && (
                  <span className="emoji text-lg" aria-hidden>
                    {measurement.emoji}
                  </span>
                )}
                <span className="flex-1 text-sm font-medium">{measurement.name}</span>
                <span className="text-muted-foreground text-xs tabular-nums">
                  {used === 0 ? "unused" : `${String(used)} ${used === 1 ? "thing" : "things"}`}
                </span>
              </div>
              <p className="text-muted-foreground mt-0.5 text-xs">
                {measurement.units.map((unit) => unit.symbol.trim() || unit.label).join(" · ")}
              </p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
