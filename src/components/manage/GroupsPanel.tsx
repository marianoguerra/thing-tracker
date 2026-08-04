import { useLiveQuery } from "@tanstack/react-db";
import { PlusIcon, Share2Icon } from "lucide-react";
import { useMemo } from "react";

import { Button } from "@/components/ui/button";
import { useCollections } from "@/db/provider";
import type { Group } from "@/db/schema";

export function GroupsPanel({
  onCreate,
  onEdit,
  onShare,
}: {
  onCreate: () => void;
  onEdit: (group: Group) => void;
  onShare: (group: Group) => void;
}) {
  const { groups } = useCollections();
  const { data: groupRows } = useLiveQuery((q) => q.from({ group: groups }));

  const sorted = useMemo(
    () =>
      [...groupRows].sort((a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title)),
    [groupRows],
  );

  return (
    <div className="p-4">
      <Button className="mb-3 w-full" onClick={onCreate}>
        <PlusIcon /> New tag
      </Button>

      <p className="text-muted-foreground mb-3 text-xs">
        Tags are yours alone — they organise your things and are what you share. Someone importing
        your tags can file the same things however they like.
      </p>

      <ul className="divide-border/60 divide-y">
        {sorted.map((group) => (
          <li key={group.id} className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onEdit(group)}
              className="flex min-w-0 flex-1 items-center gap-3 py-2.5 text-left"
            >
              {group.emoji && (
                <span className="emoji text-xl leading-none" aria-hidden>
                  {group.emoji}
                </span>
              )}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{group.title}</span>
                <span className="text-muted-foreground block text-xs tabular-nums">
                  {group.thingIds.length} {group.thingIds.length === 1 ? "thing" : "things"}
                </span>
              </span>
            </button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Share ${group.title}`}
              onClick={() => onShare(group)}
            >
              <Share2Icon />
            </Button>
          </li>
        ))}
        {sorted.length === 0 && (
          <li className="text-muted-foreground py-6 text-center text-sm">
            No tags yet. Things without tags still show up under “Ungrouped”.
          </li>
        )}
      </ul>
    </div>
  );
}
