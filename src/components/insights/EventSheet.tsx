import { ChevronRightIcon, Trash2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import type { Measurement, Thing, TrackedEvent } from "@/db/schema";
import { formatMeasurement } from "@/lib/measure/format";
import { formatTime } from "@/lib/time";

/** How many more entries each "Show more" reveals. */
export const PAGE_SIZE = 200;

type Props = {
  open: boolean;
  title: string;
  /** Undefined for a mixed list, where each row names its own thing instead. */
  thing: Thing | undefined;
  /** Needed only for the mixed list. */
  thingById?: Map<string, Thing>;
  events: TrackedEvent[];
  onClose: () => void;
  onEdit: (eventId: string) => void;
  onDelete: (eventId: string) => void;
  measurementById: Map<string, Measurement>;
  /** Entries not yet rendered. Omit for a list that is always complete. */
  remaining?: number;
  onShowMore?: () => void;
};

/** The plain chronological list, reached by drilling into an emoji chip. */
export function EventSheet({
  open,
  title,
  thing,
  thingById,
  events,
  onClose,
  onEdit,
  onDelete,
  measurementById,
  remaining = 0,
  onShowMore,
}: Props) {
  const mixed = thing === undefined;
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
            {thing?.title ?? "All entries"}
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
                {/* In a mixed list the row has to say what it is; with a single
                    thing the header already does. */}
                {mixed && (
                  <div className="flex items-center gap-1.5 text-sm font-medium">
                    <span className="emoji" aria-hidden>
                      {thingById?.get(event.thingId)?.emoji ?? "❔"}
                    </span>
                    {thingById?.get(event.thingId)?.title ?? "Deleted thing"}
                  </div>
                )}
                <div className="text-sm tabular-nums">
                  {new Date(event.actualAt).toLocaleDateString(undefined, {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                  })}{" "}
                  · {formatTime(event.actualAt)}
                  {event.measurements.map((m) => {
                    const measurement = measurementById.get(m.measurementId);
                    if (!measurement) return null;
                    return (
                      <span key={m.measurementId} className="text-muted-foreground">
                        {" "}
                        · {formatMeasurement(measurement, m.value)}
                      </span>
                    );
                  })}
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
              <ChevronRightIcon className="text-muted-foreground/50 size-4 shrink-0" aria-hidden />
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
          {remaining > 0 && onShowMore && (
            <li className="py-3">
              <Button variant="outline" className="w-full" onClick={onShowMore}>
                Show {Math.min(remaining, PAGE_SIZE)} more ({remaining} left)
              </Button>
            </li>
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
