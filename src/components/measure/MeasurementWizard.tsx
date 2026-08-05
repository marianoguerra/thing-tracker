import { ArrowLeftIcon, MinusIcon, PlusIcon, XIcon } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { Measurement, Thing } from "@/db/schema";
import { useViewportHeight } from "@/hooks/useViewportHeight";
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
 * Collects a thing's measurements, one per full screen.
 *
 * Replaces a bottom drawer, which was the wrong container twice over: its
 * drag-to-dismiss competed with scrolling the content, so reaching the lower
 * controls closed it; and neither `100dvh` nor `position: fixed` shrinks for
 * the on-screen keyboard, so focusing the value field buried everything else.
 *
 * One measurement per step keeps each screen short enough that the keyboard has
 * little left to cover, and the height comes from `visualViewport` so the
 * footer stays put when it opens.
 */
export function MeasurementWizard({ thing, prompts, onCancel, onConfirm }: Props) {
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [step, setStep] = useState(0);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const open = thing !== null;
  const viewportHeight = useViewportHeight(open);

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
    setStep(0);
    setConfirmCancel(false);
  }, [thing, prompts]);

  // The page behind must not scroll while a full-screen panel is up.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setConfirmCancel(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!open) return null;

  const prompt = prompts[step];
  const total = prompts.length;
  const last = step === total - 1;

  function setBase(measurementId: string, unitId: string, base: number) {
    const measurement = prompts.find((p) => p.measurement.id === measurementId)?.measurement;
    if (!measurement) return;
    const unit = findUnit(measurement.units, unitId) ?? measurement.units[0]!;
    const clamped = Math.max(0, base);
    setDrafts((prev) => ({
      ...prev,
      [measurementId]: {
        base: clamped,
        unitId,
        text: String(roundTo(fromBase(clamped, unit), unit.precision ?? 2)),
      },
    }));
  }

  function finish() {
    onConfirm(
      prompts.map((entry) => ({
        measurementId: entry.measurement.id,
        value: drafts[entry.measurement.id]?.base ?? 0,
      })),
    );
  }

  const draft = prompt ? drafts[prompt.measurement.id] : undefined;
  const unit =
    prompt && draft
      ? (findUnit(prompt.measurement.units, draft.unitId) ?? prompt.measurement.units[0]!)
      : undefined;
  const stepUnit =
    prompt && unit
      ? (findUnit(prompt.measurement.units, prompt.measurement.stepUnit) ?? unit)
      : undefined;
  const usual = prompt ? commonValues(prompt.history) : [];
  const ready = (draft?.base ?? 0) > 0;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Log ${thing.title}`}
      className="bg-background fixed inset-0 z-50 flex flex-col"
      // Height from the visual viewport so the footer survives the keyboard.
      style={viewportHeight ? { height: `${String(viewportHeight)}px` } : undefined}
    >
      <header className="border-border shrink-0 border-b pt-[calc(env(safe-area-inset-top,0px)+0.5rem)] pb-2">
        <div className="mx-auto flex max-w-2xl items-center gap-2 px-3">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Cancel"
            onClick={() => setConfirmCancel(true)}
          >
            <XIcon />
          </Button>
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 truncate text-sm font-medium">
              <span className="emoji" aria-hidden>
                {thing.emoji}
              </span>
              {thing.title}
            </p>
          </div>
          {total > 1 && (
            <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
              {step + 1} of {total}
            </span>
          )}
        </div>
      </header>

      {total > 1 && (
        <div className="bg-muted h-0.5 shrink-0" aria-hidden>
          <div
            className="bg-primary h-full transition-all"
            style={{ width: `${String(((step + 1) / total) * 100)}%` }}
          />
        </div>
      )}

      {prompt && draft && unit && stepUnit && (
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <div className="mx-auto max-w-2xl px-4 py-5">
            <h2 className="mb-4 flex items-center justify-center gap-1.5 text-center text-base font-semibold">
              {prompt.measurement.emoji && (
                <span className="emoji" aria-hidden>
                  {prompt.measurement.emoji}
                </span>
              )}
              {prompt.measurement.name}
            </h2>

            {/*
            Deliberately not autofocused: the chips and steppers below are the
            fast path, and opening the keyboard on arrival would hide them
            before anyone had the chance to tap one.
          */}
            <Input
              type="number"
              inputMode="decimal"
              min={0}
              step="any"
              value={draft.text}
              aria-label={prompt.measurement.name}
              onChange={(event) => {
                const text = event.target.value;
                const parsed = Number(text);
                setDrafts((prev) => ({
                  ...prev,
                  [prompt.measurement.id]: {
                    ...draft,
                    text,
                    base:
                      text.trim() === "" || Number.isNaN(parsed)
                        ? 0
                        : Math.max(0, toBase(parsed, unit)),
                  },
                }));
              }}
              className="mx-auto block h-16 w-44 text-center !text-3xl font-semibold tabular-nums"
            />

            <p className="text-muted-foreground mt-2 text-center text-sm" aria-live="polite">
              {formatMeasurement(prompt.measurement, draft.base, draft.unitId)}
            </p>

            {prompt.measurement.units.length > 1 && (
              <div className="mt-4 flex flex-wrap justify-center gap-1.5">
                {prompt.measurement.units.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    aria-pressed={option.id === draft.unitId}
                    onClick={() => {
                      // Re-expresses the same quantity rather than reinterpreting
                      // the number: km → mi keeps 5 km as 3.11 mi.
                      setDrafts((prev) => ({
                        ...prev,
                        [prompt.measurement.id]: {
                          ...draft,
                          unitId: option.id,
                          text: String(
                            roundTo(fromBase(draft.base, option), option.precision ?? 2),
                          ),
                        },
                      }));
                    }}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-xs font-medium",
                      option.id === draft.unitId
                        ? "bg-primary text-primary-foreground border-transparent"
                        : "border-border text-muted-foreground",
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}

            {usual.length > 0 && (
              <section className="mt-6">
                <h3 className="text-muted-foreground mb-2 text-xs font-medium">Usual</h3>
                <div className="flex flex-wrap gap-2">
                  {usual.map((entry) => (
                    <button
                      key={entry.value}
                      type="button"
                      onClick={() => setBase(prompt.measurement.id, draft.unitId, entry.value)}
                      className={cn(
                        "min-h-11 rounded-xl border px-4 text-sm font-medium tabular-nums",
                        entry.value === draft.base
                          ? "bg-primary text-primary-foreground border-transparent"
                          : "border-border",
                      )}
                    >
                      {formatMeasurement(prompt.measurement, entry.value, draft.unitId)}
                    </button>
                  ))}
                </div>
              </section>
            )}

            <section className="mt-6">
              <h3 className="text-muted-foreground mb-2 text-xs font-medium">
                Adjust ({stepUnit.symbol.trim() || stepUnit.label})
              </h3>
              {/* Steps stay in the measurement's own unit: "+15" of whatever is
                on screen would mean 15 days on a sleep tracker. */}
              <div className="grid grid-cols-3 gap-2">
                {prompt.measurement.steps.map((value) => (
                  <button
                    key={`plus-${String(value)}`}
                    type="button"
                    aria-label={`Add ${String(value)} ${stepUnit.label}`}
                    onClick={() =>
                      setBase(
                        prompt.measurement.id,
                        draft.unitId,
                        draft.base + value * stepUnit.factor,
                      )
                    }
                    className="border-border flex min-h-12 items-center justify-center gap-1 rounded-xl border text-sm font-medium tabular-nums"
                  >
                    <PlusIcon className="size-3.5" aria-hidden />
                    {value}
                  </button>
                ))}
                {prompt.measurement.steps.map((value) => (
                  <button
                    key={`minus-${String(value)}`}
                    type="button"
                    disabled={draft.base <= 0}
                    aria-label={`Subtract ${String(value)} ${stepUnit.label}`}
                    onClick={() =>
                      setBase(
                        prompt.measurement.id,
                        draft.unitId,
                        draft.base - value * stepUnit.factor,
                      )
                    }
                    className="border-border text-muted-foreground flex min-h-12 items-center justify-center gap-1 rounded-xl border text-sm font-medium tabular-nums disabled:opacity-40"
                  >
                    <MinusIcon className="size-3.5" aria-hidden />
                    {value}
                  </button>
                ))}
              </div>
            </section>
          </div>
        </div>
      )}

      <footer className="border-border shrink-0 border-t pt-3 pb-[calc(env(safe-area-inset-bottom,0px)+0.75rem)]">
        <div className="mx-auto flex max-w-2xl gap-2 px-4">
          {step > 0 && (
            <Button
              variant="outline"
              className="h-12 shrink-0"
              onClick={() => setStep((n) => n - 1)}
            >
              <ArrowLeftIcon /> Back
            </Button>
          )}
          <Button
            className="h-12 flex-1 text-base"
            disabled={!ready}
            onClick={() => (last ? finish() : setStep((n) => n + 1))}
          >
            {last
              ? `Log${draft && prompt ? ` ${formatMeasurement(prompt.measurement, draft.base, draft.unitId)}` : ""}`
              : "Next"}
          </Button>
        </div>
      </footer>

      <Dialog open={confirmCancel} onOpenChange={setConfirmCancel}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle>Discard this entry?</DialogTitle>
            <DialogDescription>Nothing has been logged yet.</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirmCancel(false)}>
              Keep going
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setConfirmCancel(false);
                onCancel();
              }}
            >
              Discard
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
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
