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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Thing, TrackedEvent } from "@/db/schema";
import {
  DURATION_UNITS,
  clampDuration,
  formatDuration,
  formatValue,
  fromMs,
  naturalUnit,
  toMs,
  type DurationUnit,
} from "@/lib/duration";
import { formatRelative, fromDatetimeLocal, toDatetimeLocal } from "@/lib/time";
import { cn } from "@/lib/utils";

type Props = {
  event: TrackedEvent | null;
  thing: Thing | undefined;
  onClose: () => void;
  onSave: (patch: { actualAt: number; notes: string; durationMs?: number }) => void;
  onDelete: () => void;
};

export function EventEditorDrawer({ event, thing, onClose, onSave, onDelete }: Props) {
  const [when, setWhen] = useState("");
  const [notes, setNotes] = useState("");
  const [durationMs, setDurationMs] = useState(0);
  const [unit, setUnit] = useState<DurationUnit>("minutes");
  const [durationText, setDurationText] = useState("");

  useEffect(() => {
    if (!event) return;
    setWhen(toDatetimeLocal(event.actualAt));
    setNotes(event.notes ?? "");
    const ms = event.durationMs ?? 0;
    const nextUnit = thing?.duration?.defaultUnit ?? naturalUnit(ms);
    setDurationMs(ms);
    setUnit(nextUnit);
    setDurationText(ms > 0 ? formatValue(fromMs(ms, nextUnit)) : "");
  }, [event, thing]);

  // Shown when the thing tracks duration, or when this entry already has one —
  // so turning the setting off never orphans a value the user can't see.
  const showDuration = thing?.duration !== undefined || (event?.durationMs ?? 0) > 0;

  const parsed = fromDatetimeLocal(when);
  const valid = parsed !== null;

  return (
    <Drawer open={event !== null} onOpenChange={(open) => !open && onClose()}>
      <DrawerContent>
        <DrawerHeader className="pb-2">
          <DrawerTitle className="flex items-center gap-2">
            {thing && (
              <span className="emoji text-2xl" aria-hidden>
                {thing.emoji}
              </span>
            )}
            {thing?.title ?? "Entry"}
          </DrawerTitle>
          <DrawerDescription>
            {event
              ? // recordedAt is the immutable audit trail; showing it makes an
                // edited actualAt legible rather than mysterious.
                `Recorded ${formatRelative(event.recordedAt)}`
              : null}
          </DrawerDescription>
        </DrawerHeader>

        <div className="space-y-4 px-4">
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

          {showDuration && (
            <div className="space-y-1.5">
              <Label htmlFor="event-duration">How long</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="event-duration"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="any"
                  placeholder="0"
                  value={durationText}
                  onChange={(e) => {
                    setDurationText(e.target.value);
                    const parsed = Number(e.target.value);
                    setDurationMs(
                      e.target.value.trim() === "" || Number.isNaN(parsed)
                        ? 0
                        : clampDuration(toMs(parsed, unit)),
                    );
                  }}
                  className="w-24 tabular-nums"
                />
                <div className="flex gap-1">
                  {DURATION_UNITS.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => {
                        setUnit(option);
                        setDurationText(
                          durationMs > 0 ? formatValue(fromMs(durationMs, option)) : "",
                        );
                      }}
                      aria-pressed={unit === option}
                      className={cn(
                        "rounded px-2 py-1 text-xs font-medium capitalize",
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
              {durationMs > 0 && (
                <p className="text-muted-foreground text-xs tabular-nums">
                  {formatDuration(durationMs)}
                </p>
              )}
            </div>
          )}

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

        <DrawerFooter className="gap-2">
          <Button
            disabled={!valid}
            onClick={() => {
              if (parsed !== null) onSave({ actualAt: parsed, notes, durationMs });
            }}
          >
            Save
          </Button>
          <Button variant="ghost" className="text-destructive" onClick={onDelete}>
            Delete entry
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
