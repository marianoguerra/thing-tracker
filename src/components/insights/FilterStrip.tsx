import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * A horizontally paged strip of filter chips.
 *
 * Replaces a plain overflow-x row, whose scrollbar sat under the chips looking
 * like a stray rule and made a poor drag target at a few pixels tall. The bar
 * is hidden and arrows page by a full width instead — swiping still works, so
 * nothing is taken away from touch.
 *
 * The arrows only appear when there is actually something off-screen.
 */
export function FilterStrip({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(true);

  const sync = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    // A pixel of slack: fractional scroll positions never land exactly.
    setAtStart(el.scrollLeft <= 1);
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 1);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    sync();
    const observer = new ResizeObserver(sync);
    observer.observe(el);
    for (const child of el.children) observer.observe(child);
    return () => observer.disconnect();
  }, [sync, children]);

  const page = (direction: 1 | -1) => {
    const el = ref.current;
    if (!el) return;
    el.scrollBy({ left: direction * el.clientWidth * 0.8, behavior: "smooth" });
  };

  const overflowing = !(atStart && atEnd);

  return (
    <div className="flex items-center gap-1">
      {overflowing && (
        <Arrow label="Previous filters" disabled={atStart} onClick={() => page(-1)}>
          <ChevronLeftIcon className="size-4" />
        </Arrow>
      )}

      <div
        ref={ref}
        onScroll={sync}
        className="no-scrollbar -mx-1 flex flex-1 gap-1.5 overflow-x-auto scroll-smooth px-1"
      >
        {children}
      </div>

      {overflowing && (
        <Arrow label="More filters" disabled={atEnd} onClick={() => page(1)}>
          <ChevronRightIcon className="size-4" />
        </Arrow>
      )}
    </div>
  );
}

function Arrow({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "border-border text-muted-foreground flex size-8 shrink-0 items-center justify-center rounded-md border",
        disabled && "opacity-30",
      )}
    >
      {children}
    </button>
  );
}
