import { useEffect, useState } from "react";

import type { BundleIndexEntry } from "@/bundles/build";
import { Button } from "@/components/ui/button";
import { fetchBundleIndex, fetchBundlePack } from "@/transfer/bundles";

type Props = {
  installedBundleIds: Set<string>;
  onLoad: (entry: BundleIndexEntry) => void;
};

export function BundleBrowser({ installedBundleIds, onLoad }: Props) {
  const [entries, setEntries] = useState<BundleIndexEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchBundleIndex()
      .then((list) => {
        if (!cancelled) setEntries(list);
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(cause instanceof Error ? cause.message : String(cause));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return <p className="text-muted-foreground px-4 py-6 text-sm">{error}</p>;
  }
  if (!entries) {
    return <p className="text-muted-foreground px-4 py-6 text-sm">Loading bundles…</p>;
  }

  return (
    <div className="space-y-3 p-4">
      <p className="text-muted-foreground text-sm">
        Ready-made sets of things to track. Everyone who loads a bundle gets the same identifiers,
        so data recorded against it can be compared later.
      </p>

      <ul className="space-y-2">
        {entries.map((entry) => {
          const installed = installedBundleIds.has(entry.id);
          return (
            <li
              key={entry.id}
              className="border-border/60 bg-card flex items-start gap-3 rounded-xl border p-3"
            >
              <span className="emoji text-2xl leading-none" aria-hidden>
                {entry.emoji}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="truncate text-sm font-medium">{entry.title}</h3>
                  {installed && (
                    <span className="text-muted-foreground shrink-0 text-[0.6875rem]">added</span>
                  )}
                </div>
                <p className="text-muted-foreground text-xs">{entry.description}</p>
                <p className="text-muted-foreground/70 mt-0.5 text-[0.6875rem] tabular-nums">
                  {entry.thingCount} things · {entry.groupCount}{" "}
                  {entry.groupCount === 1 ? "tag" : "tags"}
                </p>
              </div>
              <Button
                size="sm"
                variant={installed ? "outline" : "default"}
                onClick={() => onLoad(entry)}
              >
                {installed ? "Re-check" : "Add"}
              </Button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export { fetchBundlePack };
