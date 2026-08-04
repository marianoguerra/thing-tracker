import { Trash2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import type { Thing, TrackedEvent } from "@/db/schema";
import { formatDuration } from "@/lib/duration";
import { formatTime } from "@/lib/time";

type Props = {
  open: boolean;
  title: string;
  thing: Thing | undefined;
  events: TrackedEvent[];
  onClose: () => void;
  onEdit: (eventId: string) => void;
  onDelete: (eventId: string) => void;
};

/** The plain chronological list, reached by drilling into an emoji chip. */
export function EventSheet({ open, title, thing, events, onClose, onEdit, onDelete }: Props) {
  return (
    <Drawer open={open} onOpenChange={(next) => !next && onClose()}>
      <DrawerContent className="max-h-[80vh]">
        <DrawerHeader className="pb-2">
          <DrawerTitle className="flex items-center gap-2">
            {thing && (
              <span className="emoji text-2xl" aria-hidden>
                {thing.emoji}
              </span>
            )}
            {thing?.title ?? "Entries"}
          </DrawerTitle>
          <DrawerDescription>{title}</DrawerDescription>
        </DrawerHeader>

        <ul className="min-h-0 flex-1 divide-y divide-border/60 overflow-y-auto px-4">
          {events.map((event) => (
            <li key={event.id} className="flex items-center gap-2 py-2.5">
              <button
                type="button"
                onClick={() => onEdit(event.id)}
                className="min-w-0 flex-1 text-left"
              >
                <div className="text-sm tabular-nums">
                  {new Date(event.actualAt).toLocaleDateString(undefined, {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                  })}{" "}
                  · {formatTime(event.actualAt)}
                  {event.durationMs !== undefined && (
                    <span className="text-muted-foreground">
                      {" "}
                      · {formatDuration(event.durationMs)}
                    </span>
                  )}
                </div>
                {event.notes && (
                  <div className="text-muted-foreground truncate text-xs">{event.notes}</div>
                )}
                {/* Surfaced only when it disagrees with actualAt, which is the
                    only time the distinction is interesting. */}
                {Math.abs(event.recordedAt - event.actualAt) > 60_000 && (
                  <div className="text-muted-foreground/70 text-[0.6875rem]">
                    recorded {formatTime(event.recordedAt)}
                  </div>
                )}
              </button>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Delete entry"
                className="text-muted-foreground shrink-0"
                onClick={() => onDelete(event.id)}
              >
                <Trash2Icon />
              </Button>
            </li>
          ))}
          {events.length === 0 && (
            <li className="text-muted-foreground py-6 text-center text-sm">No entries.</li>
          )}
        </ul>

        <DrawerFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
