import { ChevronRightIcon } from "lucide-react";
import { useId } from "react";

import type { Thing } from "@/db/schema";
import type { TagRow as TagRowData } from "@/domain/grouping";
import type { UsageIndex } from "@/domain/ranking";
import { usePressGesture } from "@/hooks/usePressGesture";
import { cn } from "@/lib/utils";
import { EmojiButton } from "./EmojiButton";

type Props = {
  row: TagRowData;
  usage: UsageIndex;
  open: boolean;
  compact: boolean;
  onToggle: () => void;
  onToggleAll: () => void;
  onLog: (thing: Thing) => void;
  onInspect: (thing: Thing) => void;
};

export function TagRow({
  row,
  usage,
  open,
  compact,
  onToggle,
  onToggleAll,
  onLog,
  onInspect,
}: Props) {
  const bodyId = useId();
  // The header is the collapse-all gesture target: tap collapses this section,
  // press and hold collapses or expands every section at once.
  const press = usePressGesture({ onTap: onToggle, onLongPress: onToggleAll });

  return (
    <section className="py-1">
      <h2>
        <button
          type="button"
          {...press}
          aria-expanded={open}
          aria-controls={bodyId}
          className="text-muted-foreground flex w-full items-center gap-1.5 px-4 py-2 text-left text-xs font-semibold tracking-wide uppercase select-none [touch-action:manipulation] [-webkit-tap-highlight-color:transparent]"
        >
          <ChevronRightIcon
            className={cn("size-3.5 transition-transform", open && "rotate-90")}
            aria-hidden
          />
          {row.emoji && (
            <span className="emoji not-italic" aria-hidden>
              {row.emoji}
            </span>
          )}
          <span className="truncate">{row.title}</span>
          <span className="text-muted-foreground/60 font-normal tabular-nums">
            {row.things.length}
          </span>
        </button>
      </h2>

      {open && (
        <div
          id={bodyId}
          className={cn(
            "grid gap-2 px-4 pt-1 pb-2",
            compact ? "grid-cols-6 min-[480px]:grid-cols-8" : "grid-cols-4 min-[480px]:grid-cols-6",
          )}
        >
          {row.things.map((thing) => {
            const stats = usage.get(thing.id);
            return (
              <EmojiButton
                key={thing.id}
                thing={thing}
                lastAt={stats?.lastAt}
                total={stats?.total}
                compact={compact}
                onLog={() => onLog(thing)}
                onLongPress={() => onInspect(thing)}
              />
            );
          })}
        </div>
      )}
    </section>
  );
}
