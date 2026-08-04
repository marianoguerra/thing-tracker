import type { Thing } from "@/db/schema";
import type { Bucket, Granularity } from "@/domain/buckets";
import { cn } from "@/lib/utils";

const SUPERSCRIPT = ["⁰", "¹", "²", "³", "⁴", "⁵", "⁶", "⁷", "⁸", "⁹"];

/** 12 → "¹²". Falls back to a plain number past three digits. */
function superscript(n: number): string {
  if (n > 999) return `×${n}`;
  return String(n)
    .split("")
    .map((digit) => SUPERSCRIPT[Number(digit)] ?? digit)
    .join("");
}

export function formatBucketLabel(start: number, granularity: Granularity, now: number): string {
  const date = new Date(start);
  if (granularity === "month") {
    return date.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  }
  if (granularity === "week") {
    const end = new Date(start + 6 * 86_400_000);
    const sameMonth = date.getMonth() === end.getMonth();
    const from = date.toLocaleDateString(undefined, {
      day: "numeric",
      month: sameMonth ? undefined : "short",
    });
    const to = end.toLocaleDateString(undefined, { day: "numeric", month: "short" });
    return `${from} – ${to}`;
  }

  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.round((today.getTime() - start) / 86_400_000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    ...(date.getFullYear() === today.getFullYear() ? {} : { year: "numeric" }),
  });
}

type Props = {
  bucket: Bucket;
  granularity: Granularity;
  now: number;
  thingById: Map<string, Thing>;
  onSelect: (thingId: string, bucket: Bucket) => void;
};

export function BucketRow({ bucket, granularity, now, thingById, onSelect }: Props) {
  return (
    <section className="border-border/60 border-b px-4 py-3">
      <h2 className="text-muted-foreground mb-2 flex items-baseline gap-2 text-xs font-semibold tracking-wide uppercase">
        <span>{formatBucketLabel(bucket.start, granularity, now)}</span>
        <span className="text-muted-foreground/60 font-normal tabular-nums">{bucket.total}</span>
      </h2>

      <div className="flex flex-wrap gap-1.5">
        {bucket.chips.map((chip) => {
          const thing = thingById.get(chip.thingId);
          // An event whose thing was deleted still happened; showing a
          // placeholder beats silently dropping it from the count.
          const emoji = thing?.emoji ?? "❔";
          const title = thing?.title ?? "Deleted thing";
          return (
            <button
              key={chip.thingId}
              type="button"
              onClick={() => onSelect(chip.thingId, bucket)}
              aria-label={`${title}, ${chip.count} ${chip.count === 1 ? "time" : "times"}`}
              title={`${title} · ${chip.count}`}
              className={cn(
                "border-border/60 bg-card flex items-center gap-0.5 rounded-lg border py-1.5 pr-1.5 pl-2 transition-colors",
                "active:bg-accent",
              )}
            >
              <span className="emoji text-xl leading-none" aria-hidden>
                {emoji}
              </span>
              {/* A count only earns space once there is more than one. */}
              {chip.count > 1 && (
                <span className="text-muted-foreground text-xs leading-none" aria-hidden>
                  {superscript(chip.count)}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}
