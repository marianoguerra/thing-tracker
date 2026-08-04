import type { Thing } from "@/db/schema";
import { usePressGesture } from "@/hooks/usePressGesture";
import { formatRelative } from "@/lib/time";
import { cn } from "@/lib/utils";

type Props = {
  thing: Thing;
  lastAt?: number;
  total?: number;
  compact: boolean;
  onLog: () => void;
  onLongPress: () => void;
};

export function EmojiButton({ thing, lastAt, total, compact, onLog, onLongPress }: Props) {
  const press = usePressGesture({ onTap: onLog, onLongPress });

  const subtitle = lastAt === undefined ? "never" : formatRelative(lastAt);

  return (
    <button
      type="button"
      {...press}
      aria-label={`Log ${thing.title}${total ? `, logged ${total} times, last ${subtitle}` : ", never logged"}`}
      title={thing.title}
      className={cn(
        "group border-border/60 bg-card flex flex-col items-center justify-center gap-1 rounded-xl border transition-transform select-none",
        // `manipulation`, never `none`: `touch-action: none` would kill
        // scrolling over the grid entirely.
        "[touch-action:manipulation] [-webkit-tap-highlight-color:transparent] [-webkit-touch-callout:none]",
        "active:scale-95 active:brightness-125",
        compact ? "aspect-square" : "min-h-20 px-1 py-2",
      )}
      style={thing.color ? { borderColor: thing.color } : undefined}
    >
      <span className="emoji text-3xl leading-none" aria-hidden>
        {thing.emoji}
      </span>
      {!compact && (
        <>
          <span className="w-full truncate text-center text-[0.6875rem] leading-tight font-medium">
            {thing.title}
          </span>
          <span className="text-muted-foreground text-[0.625rem] leading-none tabular-nums">
            {subtitle}
          </span>
        </>
      )}
    </button>
  );
}
