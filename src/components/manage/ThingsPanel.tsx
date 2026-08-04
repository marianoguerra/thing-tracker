import { useLiveQuery } from "@tanstack/react-db";
import { PlusIcon } from "lucide-react";
import { useMemo } from "react";

import { Button } from "@/components/ui/button";
import { useCollections } from "@/db/provider";
import type { Thing } from "@/db/schema";
import { groupsByThing } from "@/domain/grouping";

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

  const byThing = useMemo(() => groupsByThing(groupRows), [groupRows]);
  const sorted = useMemo(
    () => [...thingRows].sort((a, b) => a.title.localeCompare(b.title)),
    [thingRows],
  );

  return (
    <div className="p-4">
      <Button className="mb-3 w-full" onClick={onCreate}>
        <PlusIcon /> New thing
      </Button>

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
          <li className="text-muted-foreground py-6 text-center text-sm">
            No things yet. Add one, or load a bundle.
          </li>
        )}
      </ul>
    </div>
  );
}
