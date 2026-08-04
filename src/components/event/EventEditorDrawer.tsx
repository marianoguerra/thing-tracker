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
import { formatRelative, fromDatetimeLocal, toDatetimeLocal } from "@/lib/time";

type Props = {
  event: TrackedEvent | null;
  thing: Thing | undefined;
  onClose: () => void;
  onSave: (patch: { actualAt: number; notes: string }) => void;
  onDelete: () => void;
};

export function EventEditorDrawer({ event, thing, onClose, onSave, onDelete }: Props) {
  const [when, setWhen] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!event) return;
    setWhen(toDatetimeLocal(event.actualAt));
    setNotes(event.notes ?? "");
  }, [event]);

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
              if (parsed !== null) onSave({ actualAt: parsed, notes });
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
