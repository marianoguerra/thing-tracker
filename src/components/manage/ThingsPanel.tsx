import { useLiveQuery } from "@tanstack/react-db";
import { PlusIcon } from "lucide-react";
import { useDeferredValue, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { useCollections } from "@/db/provider";
import type { Thing } from "@/db/schema";
import { groupsByThing } from "@/domain/grouping";
import { filterThings } from "@/domain/search";
import { ManageSearch, NoMatches } from "./ManageSearch";

export function ThingsPanel({
  onCreate,
  onEdit,
}: {
  onCreate: () => void;
  onEdit: (thing: Thing) => void;
}) {
  const { things, groups } = useCollections();
  const { data: thingRows } = useLiveQuery((q) => q.from({ thing: things }));
  const { data: groupRows } = useLiveQuery((q) => q.from({ group: groups }));

  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);

  const byThing = useMemo(() => groupsByThing(groupRows), [groupRows]);
  const sorted = useMemo(() => {
    // Ranked relevance while searching (title beats description, emoji counts),
    // alphabetical otherwise.
    if (deferredQuery.trim()) return filterThings(thingRows, deferredQuery);
    return [...thingRows].sort((a, b) => a.title.localeCompare(b.title));
  }, [thingRows, deferredQuery]);

  return (
    <div className="p-4">
      <Button className="mb-3 w-full" onClick={onCreate}>
        <PlusIcon /> New thing
      </Button>

      {thingRows.length > 0 && (
        <div className="mb-2">
          <ManageSearch value={query} onChange={setQuery} placeholder="Search things…" />
        </div>
      )}

      <ul className="divide-border/60 divide-y">
        {sorted.map((thing) => {
          const tags = byThing.get(thing.id) ?? [];
          return (
            <li key={thing.id}>
              <button
                type="button"
                onClick={() => onEdit(thing)}
                className="flex w-full items-center gap-3 py-2.5 text-left"
              >
                <span className="emoji text-2xl leading-none" aria-hidden>
                  {thing.emoji}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{thing.title}</span>
                  <span className="text-muted-foreground block truncate text-xs">
                    {tags.length > 0 ? tags.map((tag) => tag.title).join(" · ") : "No tags"}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
        {sorted.length === 0 && (
          <li>
            {deferredQuery.trim() ? (
              <NoMatches query={deferredQuery} />
            ) : (
              <p className="text-muted-foreground py-6 text-center text-sm">
                No things yet. Add one, or load a bundle.
              </p>
            )}
          </li>
        )}
      </ul>
    </div>
  );
}
