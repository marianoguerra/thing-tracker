import { Link } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";

/**
 * First launch. A bundle is offered before "create a thing" on purpose: picking
 * from a ready-made set is a far lower bar than inventing your own taxonomy,
 * and bundles carry shared ids, which is what makes the data comparable later.
 */
export function EmptyState({ onCreateThing }: { onCreateThing: () => void }) {
  return (
    <div className="flex flex-col items-center gap-6 px-6 py-16 text-center">
      <div className="text-5xl" aria-hidden>
        ⚡
      </div>
      <div className="space-y-1.5">
        <h1 className="text-lg font-semibold">Nothing to track yet</h1>
        <p className="text-muted-foreground max-w-xs text-sm">
          Start from a ready-made bundle, or add your own thing. Either way, one tap logs it.
        </p>
      </div>
      <div className="flex w-full max-w-xs flex-col gap-2">
        <Button asChild>
          <Link to="/manage" search={{ tab: "bundles" }}>
            Browse bundles
          </Link>
        </Button>
        <Button variant="outline" onClick={onCreateThing}>
          Create a thing
        </Button>
      </div>
    </div>
  );
}
