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
import type { Measurement, Thing } from "@/db/schema";
import { findUnit, fromBase, roundTo, toBase } from "@/lib/measure/convert";
import { commonValues, formatMeasurement, preferredUnit } from "@/lib/measure/format";
import { cn } from "@/lib/utils";

export type MeasurementPrompt = {
  measurement: Measurement;
  /** Unit this thing prefers, overriding the measurement default. */
  unitId?: string;
  /** Past values in base units, newest first. */
  history: number[];
};

type Props = {
  thing: Thing | null;
  prompts: MeasurementPrompt[];
  onCancel: () => void;
  onConfirm: (values: { measurementId: string; value: number }[]) => void;
};

type Draft = { base: number; unitId: string; text: string };

/**
 * Asks for a thing's measurements in as few taps as possible.
 *
 * Built on the observation that recorded quantities repeat — the same 5 km run,
 * the same 8-hour night. Each measurement opens pre-filled with last time's
 * value and offers the usual ones as single-tap chips, so confirming is often
 * the only tap. Typing is the fallback, not the primary path.
 *
 * A thing can carry several measurements (a run is distance *and* duration),
 * so they are all filled in on one sheet rather than one drawer per quantity.
 */
export function MeasurementSheet({ thing, prompts, onCancel, onConfirm }: Props) {
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});

  useEffect(() => {
    if (!thing) return;
    const next: Record<string, Draft> = {};
    for (const prompt of prompts) {
      const base = prompt.history[0] ?? defaultFor(prompt);
      const unit = preferredUnit(prompt.measurement, prompt.unitId, base);
      next[prompt.measurement.id] = {
        base,
        unitId: unit.id,
        text: String(roundTo(fromBase(base, unit), unit.precision ?? 2)),
      };
    }
    setDrafts(next);
  }, [thing, prompts]);

  function setBase(prompt: MeasurementPrompt, base: number) {
    setDrafts((prev) => {
      const current = prev[prompt.measurement.id];
      if (!current) return prev;
      const unit =
        findUnit(prompt.measurement.units, current.unitId) ?? prompt.measurement.units[0]!;
      const clamped = Math.max(0, base);
      return {
        ...prev,
        [prompt.measurement.id]: {
          ...current,
          base: clamped,
          text: String(roundTo(fromBase(clamped, unit), unit.precision ?? 2)),
        },
      };
    });
  }

  const ready = prompts.every((prompt) => (drafts[prompt.measurement.id]?.base ?? 0) > 0);

  return (
    <Drawer open={thing !== null} onOpenChange={(open) => !open && onCancel()}>
      <DrawerContent className="max-h-[92vh]">
        <DrawerHeader className="pb-1">
          <DrawerTitle className="flex items-center gap-2">
            {thing && (
              <span className="emoji text-2xl" aria-hidden>
                {thing.emoji}
              </span>
            )}
            {thing?.title}
          </DrawerTitle>
          <DrawerDescription>
            {prompts.length === 1 ? prompts[0]?.measurement.name : "Fill in the details"}
          </DrawerDescription>
        </DrawerHeader>

        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-4 pt-2">
          {prompts.map((prompt) => {
            const { measurement } = prompt;
            const draft = drafts[measurement.id];
            if (!draft) return null;
            const unit = findUnit(measurement.units, draft.unitId) ?? measurement.units[0]!;
            const stepUnit = findUnit(measurement.units, measurement.stepUnit) ?? unit;
            const usual = commonValues(prompt.history);

            return (
              <section key={measurement.id} className="space-y-3">
                {prompts.length > 1 && (
                  <h3 className="text-muted-foreground flex items-center gap-1.5 text-xs font-semibold tracking-wide uppercase">
                    {measurement.emoji && (
                      <span className="emoji" aria-hidden>
                        {measurement.emoji}
                      </span>
                    )}
                    {measurement.name}
                  </h3>
                )}

                <div className="flex items-start justify-center gap-2">
                  <Input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step="any"
                    value={draft.text}
                    aria-label={measurement.name}
                    onChange={(event) => {
                      const text = event.target.value;
                      const parsed = Number(text);
                      setDrafts((prev) => ({
                        ...prev,
                        [measurement.id]: {
                          ...draft,
                          text,
                          base:
                            text.trim() === "" || Number.isNaN(parsed)
                              ? 0
                              : Math.max(0, toBase(parsed, unit)),
                        },
                      }));
                    }}
                    className="h-14 w-32 text-center !text-2xl font-semibold tabular-nums"
                  />
                  <div className="flex max-h-28 flex-col gap-0.5 overflow-y-auto">
                    {measurement.units.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        aria-pressed={option.id === draft.unitId}
                        onClick={() => {
                          // Re-expresses the same real quantity rather than
                          // reinterpreting the number: km → mi keeps 5 km as
                          // 3.11 mi, not 5 mi.
                          setDrafts((prev) => ({
                            ...prev,
                            [measurement.id]: {
                              ...draft,
                              unitId: option.id,
                              text: String(
                                roundTo(fromBase(draft.base, option), option.precision ?? 2),
                              ),
                            },
                          }));
                        }}
                        className={cn(
                          "rounded px-2 py-0.5 text-xs font-medium whitespace-nowrap",
                          option.id === draft.unitId
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground",
                        )}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                <p
                  className="text-muted-foreground text-center text-sm tabular-nums"
                  aria-live="polite"
                >
                  {formatMeasurement(measurement, draft.base, draft.unitId)}
                </p>

                {usual.length > 0 && (
                  <div>
                    <h4 className="text-muted-foreground mb-1.5 text-xs font-medium">Usual</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {usual.map((entry) => (
                        <button
                          key={entry.value}
                          type="button"
                          onClick={() => setBase(prompt, entry.value)}
                          className={cn(
                            "rounded-full border px-3 py-1.5 text-sm font-medium tabular-nums",
                            entry.value === draft.base
                              ? "bg-primary text-primary-foreground border-transparent"
                              : "border-border",
                          )}
                        >
                          {formatMeasurement(measurement, entry.value, draft.unitId)}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <h4 className="text-muted-foreground mb-1.5 text-xs font-medium">
                    Adjust ({stepUnit.symbol.trim() || stepUnit.label})
                  </h4>
                  {/* Steps are fixed to the measurement's own step unit, never
                      the selected one: "+15" of whatever happens to be showing
                      would mean 15 days on a sleep tracker. */}
                  <div
                    className="grid gap-1.5"
                    style={{
                      gridTemplateColumns: `repeat(${String(measurement.steps.length)}, minmax(0, 1fr))`,
                    }}
                  >
                    {measurement.steps.map((step) => (
                      <button
                        key={`minus-${String(step)}`}
                        type="button"
                        disabled={draft.base <= 0}
                        aria-label={`Subtract ${String(step)} ${stepUnit.label}`}
                        onClick={() => setBase(prompt, draft.base - step * stepUnit.factor)}
                        className="border-border flex flex-col items-center rounded-md border py-1.5 text-xs font-medium tabular-nums disabled:opacity-40"
                      >
                        <MinusIcon className="size-3" aria-hidden />
                        {step}
                      </button>
                    ))}
                    {measurement.steps.map((step) => (
                      <button
                        key={`plus-${String(step)}`}
                        type="button"
                        aria-label={`Add ${String(step)} ${stepUnit.label}`}
                        onClick={() => setBase(prompt, draft.base + step * stepUnit.factor)}
                        className="border-border flex flex-col items-center rounded-md border py-1.5 text-xs font-medium tabular-nums"
                      >
                        <PlusIcon className="size-3" aria-hidden />
                        {step}
                      </button>
                    ))}
                  </div>
                </div>
              </section>
            );
          })}
        </div>

        <DrawerFooter className="gap-2">
          <Button
            disabled={!ready}
            onClick={() => {
              onConfirm(
                prompts.map((prompt) => ({
                  measurementId: prompt.measurement.id,
                  value: drafts[prompt.measurement.id]?.base ?? 0,
                })),
              );
            }}
          >
            Log
            {prompts.length === 1 && prompts[0]
              ? ` ${formatMeasurement(
                  prompts[0].measurement,
                  drafts[prompts[0].measurement.id]?.base ?? 0,
                  drafts[prompts[0].measurement.id]?.unitId,
                )}`
              : ""}
          </Button>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

/** A sensible opening value when this thing has never been recorded. */
function defaultFor(prompt: MeasurementPrompt): number {
  const unit =
    findUnit(prompt.measurement.units, prompt.unitId) ??
    findUnit(prompt.measurement.units, prompt.measurement.defaultUnit) ??
    prompt.measurement.units[0]!;
  return unit.factor;
}
