import { GRANULARITIES, type Granularity } from "@/domain/buckets";
import { cn } from "@/lib/utils";

const LABELS: Record<Granularity, string> = { day: "Day", week: "Week", month: "Month" };

export function GranularityToggle({
  value,
  onChange,
}: {
  value: Granularity;
  onChange: (next: Granularity) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="Group entries by"
      className="bg-muted flex rounded-lg p-0.5 text-sm font-medium"
    >
      {GRANULARITIES.map((granularity) => (
        <button
          key={granularity}
          type="button"
          role="tab"
          aria-selected={value === granularity}
          onClick={() => onChange(granularity)}
          className={cn(
            "flex-1 rounded-md px-3 py-1.5 transition-colors",
            value === granularity
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground",
          )}
        >
          {LABELS[granularity]}
        </button>
      ))}
    </div>
  );
}
