import { MinusIcon, PlusIcon } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import type { Thing } from "@/db/schema";
import {
  DURATION_UNITS,
  STEP_MINUTES,
  UNIT_MS,
  clampDuration,
  formatDuration,
  formatValue,
  fromMs,
  naturalUnit,
  toMs,
  type DurationUnit,
} from "@/lib/duration";
import { cn } from "@/lib/utils";

type Props = {
  thing: Thing | null;
  /** Most-used durations for this thing, most frequent first. */
  common: { ms: number; count: number }[];
  /** The duration used last time, pre-filled so a repeat is one tap. */
  lastMs: number | undefined;
  onCancel: () => void;
  onConfirm: (durationMs: number) => void;
};

/**
 * Asks how long, in as few taps as possible.
 *
 * The design assumption is that durations repeat: the same 30-minute walk, the
 * same 8-hour night. So the sheet opens pre-filled with last time's value and
 * offers this thing's usual durations as single-tap chips — Save is often the
 * only tap needed. Typing a number is the fallback, not the primary path.
 */
export function DurationSheet({ thing, common, lastMs, onCancel, onConfirm }: Props) {
  const [ms, setMs] = useState(0);
  const [unit, setUnit] = useState<DurationUnit>("minutes");
  const [text, setText] = useState("");

  useEffect(() => {
    if (!thing) return;
    const initial = lastMs ?? common[0]?.ms ?? UNIT_MS[thing.duration?.defaultUnit ?? "minutes"];
    const nextUnit = thing.duration?.defaultUnit ?? naturalUnit(initial);
    setMs(initial);
    setUnit(nextUnit);
    setText(formatValue(fromMs(initial, nextUnit)));
  }, [thing, lastMs, common]);

  function apply(nextMs: number) {
    const clamped = clampDuration(nextMs);
    setMs(clamped);
    setText(formatValue(fromMs(clamped, unit)));
  }

  function changeUnit(next: DurationUnit) {
    // Keeps the same real duration and re-expresses it, rather than
    // reinterpreting "30" as 30 days when switching minutes → days.
    setUnit(next);
    setText(formatValue(fromMs(ms, next)));
  }

  return (
    <Drawer open={thing !== null} onOpenChange={(open) => !open && onCancel()}>
      <DrawerContent>
        <DrawerHeader className="pb-1">
          <DrawerTitle className="flex items-center gap-2">
            {thing && (
              <span className="emoji text-2xl" aria-hidden>
                {thing.emoji}
              </span>
            )}
            {thing?.title}
          </DrawerTitle>
          <DrawerDescription>How long did it last?</DrawerDescription>
        </DrawerHeader>

        <div className="space-y-4 px-4 pt-2">
          <div className="flex items-center justify-center gap-2">
            <Input
              type="number"
              inputMode="decimal"
              min={0}
              step="any"
              value={text}
              onChange={(event) => {
                setText(event.target.value);
                const parsed = Number(event.target.value);
                if (!Number.isNaN(parsed)) setMs(clampDuration(toMs(parsed, unit)));
              }}
              aria-label="Duration"
              className="h-14 w-32 text-center !text-2xl font-semibold tabular-nums"
            />
            <div className="flex flex-col gap-1">
              {DURATION_UNITS.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => changeUnit(option)}
                  aria-pressed={unit === option}
                  className={cn(
                    "rounded px-2 py-0.5 text-xs font-medium capitalize",
                    unit === option
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground",
                  )}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          <p className="text-muted-foreground text-center text-sm tabular-nums" aria-live="polite">
            {formatDuration(ms)}
          </p>

          {common.length > 0 && (
            <section>
              <h3 className="text-muted-foreground mb-1.5 text-xs font-medium">Usual</h3>
              <div className="flex flex-wrap gap-1.5">
                {common.map((entry) => (
                  <button
                    key={entry.ms}
                    type="button"
                    onClick={() => apply(entry.ms)}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-sm font-medium tabular-nums transition-colors",
                      entry.ms === ms
                        ? "bg-primary text-primary-foreground border-transparent"
                        : "border-border",
                    )}
                  >
                    {formatDuration(entry.ms)}
                  </button>
                ))}
              </div>
            </section>
          )}

          <section>
            <h3 className="text-muted-foreground mb-1.5 text-xs font-medium">Adjust</h3>
            {/* Steps are always minutes: "+15" of the selected unit would mean
                15 days on a sleep tracker. */}
            <div className="grid grid-cols-6 gap-1.5">
              {STEP_MINUTES.map((step) => (
                <button
                  key={`minus-${String(step)}`}
                  type="button"
                  onClick={() => apply(ms - step * UNIT_MS.minutes)}
                  aria-label={`Subtract ${String(step)} minutes`}
                  disabled={ms <= 0}
                  className="border-border flex flex-col items-center rounded-md border py-1.5 text-xs font-medium tabular-nums disabled:opacity-40"
                >
                  <MinusIcon className="size-3" aria-hidden />
                  {step}
                </button>
              ))}
              {STEP_MINUTES.map((step) => (
                <button
                  key={`plus-${String(step)}`}
                  type="button"
                  onClick={() => apply(ms + step * UNIT_MS.minutes)}
                  aria-label={`Add ${String(step)} minutes`}
                  className="border-border flex flex-col items-center rounded-md border py-1.5 text-xs font-medium tabular-nums"
                >
                  <PlusIcon className="size-3" aria-hidden />
                  {step}
                </button>
              ))}
            </div>
          </section>
        </div>

        <DrawerFooter className="gap-2">
          <Button disabled={ms <= 0} onClick={() => onConfirm(ms)}>
            Log {formatDuration(ms)}
          </Button>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
