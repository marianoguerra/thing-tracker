import { useEffect, useState } from "react";

import { FullScreenPanel } from "@/components/layout/FullScreenPanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { EventMeasurement, Measurement, Thing, TrackedEvent } from "@/db/schema";
import { findUnit, fromBase, roundTo, toBase } from "@/lib/measure/convert";
import { formatMeasurement, preferredUnit } from "@/lib/measure/format";
import { formatRelative, fromDatetimeLocal, toDatetimeLocal } from "@/lib/time";
import { cn } from "@/lib/utils";

/**
 * `create` holds an unsaved draft, so backdating an entry writes nothing until
 * Save — a long-press that silently logged something would be worse than no
 * shortcut at all.
 */
export type EventEditorState =
  | { mode: "create"; event: TrackedEvent; thing: Thing | undefined }
  | { mode: "edit"; event: TrackedEvent; thing: Thing | undefined };

type Props = {
  state: EventEditorState | null;
  onClose: () => void;
  onSave: (patch: { actualAt: number; notes: string; measurements: EventMeasurement[] }) => void;
  onDelete: () => void;
  /** Every registered measurement, for resolving ids to scales. */
  measurementById: Map<string, Measurement>;
};

export function EventEditorPanel({ state, onClose, onSave, onDelete, measurementById }: Props) {
  const event = state?.event ?? null;
  const thing = state?.thing;
  const creating = state?.mode === "create";
  const [when, setWhen] = useState("");
  const [notes, setNotes] = useState("");
  const [values, setValues] = useState<
    Record<string, { base: number; unitId: string; text: string }>
  >({});

  useEffect(() => {
    if (!event) return;
    setWhen(toDatetimeLocal(event.actualAt));
    setNotes(event.notes ?? "");

    // Everything the thing declares, plus anything this entry already carries —
    // so turning a measurement off on the thing never orphans a recorded value
    // where nobody can see or correct it.
    const ids = new Set([
      ...(thing?.measurements ?? []).map((m) => m.measurementId),
      ...event.measurements.map((m) => m.measurementId),
    ]);
    const next: Record<string, { base: number; unitId: string; text: string }> = {};
    for (const id of ids) {
      const measurement = measurementById.get(id);
      if (!measurement) continue;
      const base = event.measurements.find((m) => m.measurementId === id)?.value ?? 0;
      const thingUnit = thing?.measurements.find((m) => m.measurementId === id)?.unit;
      const unit = preferredUnit(measurement, thingUnit, base);
      next[id] = {
        base,
        unitId: unit.id,
        text: base > 0 ? String(roundTo(fromBase(base, unit), unit.precision ?? 2)) : "",
      };
    }
    setValues(next);
  }, [event, thing, measurementById]);

  const rows = Object.keys(values)
    .map((id) => measurementById.get(id))
    .filter((m): m is Measurement => m !== undefined);

  const parsed = fromDatetimeLocal(when);
  const valid = parsed !== null;

  return (
    <FullScreenPanel
      open={state !== null}
      title={
        <span className="flex items-center gap-1.5">
          {thing && (
            <span className="emoji" aria-hidden>
              {thing.emoji}
            </span>
          )}
          {thing?.title ?? "Entry"}
        </span>
      }
      description={
        creating
          ? "Set when this happened."
          : // recordedAt is the immutable audit trail; showing it makes an
            // edited actualAt legible rather than mysterious.
            event
            ? `Recorded ${formatRelative(event.recordedAt)}`
            : undefined
      }
      confirmClose={{
        title: creating ? "Discard this entry?" : "Discard changes?",
        description: creating ? "Nothing has been logged yet." : "Your edits won't be saved.",
      }}
      onClose={onClose}
      footer={
        <>
          {!creating && (
            <Button variant="outline" className="text-destructive h-12 shrink-0" onClick={onDelete}>
              Delete
            </Button>
          )}
          <Button
            className="h-12 flex-1 text-base"
            disabled={!valid}
            onClick={() => {
              if (parsed !== null) {
                onSave({
                  actualAt: parsed,
                  notes,
                  measurements: Object.entries(values)
                    .filter(([, draft]) => draft.base > 0)
                    .map(([measurementId, draft]) => ({ measurementId, value: draft.base })),
                });
              }
            }}
          >
            {creating ? "Log entry" : "Save"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="event-when">When did it happen?</Label>
          <Input
            id="event-when"
            type="datetime-local"
            value={when}
            onChange={(e) => setWhen(e.target.value)}
            aria-invalid={!valid}
          />
          {!valid && <p className="text-destructive text-xs">That isn&apos;t a valid time.</p>}
        </div>

        {rows.map((measurement) => {
          const draft = values[measurement.id]!;
          const unit = findUnit(measurement.units, draft.unitId) ?? measurement.units[0]!;
          return (
            <div key={measurement.id} className="space-y-1.5">
              <Label htmlFor={`event-m-${measurement.id}`}>{measurement.name}</Label>
              <div className="flex items-start gap-2">
                <Input
                  id={`event-m-${measurement.id}`}
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="any"
                  placeholder="0"
                  value={draft.text}
                  onChange={(e) => {
                    const text = e.target.value;
                    const parsed = Number(text);
                    setValues((prev) => ({
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
                  className="w-24 tabular-nums"
                />
                <div className="flex max-h-20 flex-wrap gap-1 overflow-y-auto">
                  {measurement.units.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      aria-pressed={option.id === draft.unitId}
                      onClick={() => {
                        setValues((prev) => ({
                          ...prev,
                          [measurement.id]: {
                            ...draft,
                            unitId: option.id,
                            text:
                              draft.base > 0
                                ? String(
                                    roundTo(fromBase(draft.base, option), option.precision ?? 2),
                                  )
                                : "",
                          },
                        }));
                      }}
                      className={cn(
                        "rounded px-2 py-1 text-xs font-medium",
                        option.id === draft.unitId
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground",
                      )}
                    >
                      {option.symbol.trim() || option.label}
                    </button>
                  ))}
                </div>
              </div>
              {draft.base > 0 && (
                <p className="text-muted-foreground text-xs tabular-nums">
                  {formatMeasurement(measurement, draft.base, draft.unitId)}
                </p>
              )}
            </div>
          );
        })}

        <div className="space-y-1.5">
          <Label htmlFor="event-notes">Notes (optional)</Label>
          <Textarea
            id="event-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Anything worth remembering about this one?"
            rows={3}
          />
        </div>
      </div>
    </FullScreenPanel>
  );
}
