import { XIcon } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useViewportHeight } from "@/hooks/useViewportHeight";

type ConfirmClose = {
  title: string;
  description?: string;
  confirmLabel?: string;
};

type Props = {
  open: boolean;
  title: ReactNode;
  description?: ReactNode;
  /** Right-hand side of the header, e.g. a step counter. */
  headerExtra?: ReactNode;
  /** 0–1; renders a progress bar under the header when given. */
  progress?: number;
  /** Ask before discarding. Omit to close immediately. */
  confirmClose?: ConfirmClose;
  onClose: () => void;
  footer: ReactNode;
  children: ReactNode;
};

/**
 * A full-screen panel for anything with a text field in it.
 *
 * Bottom drawers are the wrong container for editing: drag-to-dismiss competes
 * with scrolling the content, and neither `100dvh` nor `position: fixed`
 * shrinks when the on-screen keyboard opens — so the form ends up behind the
 * keys with no way to reach the save button.
 *
 * The height comes from `visualViewport`, which is the only measure that
 * accounts for the keyboard, so the footer stays reachable and the content area
 * simply gets shorter and scrolls.
 */
export function FullScreenPanel({
  open,
  title,
  description,
  headerExtra,
  progress,
  confirmClose,
  onClose,
  footer,
  children,
}: Props) {
  const [confirming, setConfirming] = useState(false);
  const viewportHeight = useViewportHeight(open);

  useEffect(() => {
    if (!open) setConfirming(false);
  }, [open]);

  // The page behind must not scroll while this is up.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  function requestClose() {
    if (confirmClose) setConfirming(true);
    else onClose();
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") requestClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, confirmClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="bg-background fixed inset-0 z-50 flex flex-col"
      style={viewportHeight ? { height: `${String(viewportHeight)}px` } : undefined}
    >
      <header className="border-border shrink-0 border-b pt-[calc(env(safe-area-inset-top,0px)+0.5rem)] pb-2">
        <div className="mx-auto flex max-w-2xl items-center gap-2 px-3">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Close"
            className="size-11 shrink-0"
            onClick={requestClose}
          >
            <XIcon />
          </Button>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium">{title}</div>
            {description && (
              <div className="text-muted-foreground truncate text-xs">{description}</div>
            )}
          </div>
          {headerExtra}
        </div>
      </header>

      {progress !== undefined && (
        <div className="bg-muted h-0.5 shrink-0" aria-hidden>
          <div
            className="bg-primary h-full transition-all"
            style={{ width: `${String(Math.round(progress * 100))}%` }}
          />
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div className="mx-auto max-w-2xl px-4 py-4">{children}</div>
      </div>

      <footer className="border-border shrink-0 border-t pt-3 pb-[calc(env(safe-area-inset-bottom,0px)+0.75rem)]">
        <div className="mx-auto flex max-w-2xl gap-2 px-4">{footer}</div>
      </footer>

      {confirmClose && (
        <Dialog open={confirming} onOpenChange={setConfirming}>
          <DialogContent className="max-w-xs">
            <DialogHeader>
              <DialogTitle>{confirmClose.title}</DialogTitle>
              {confirmClose.description && (
                <DialogDescription>{confirmClose.description}</DialogDescription>
              )}
            </DialogHeader>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setConfirming(false)}>
                Keep editing
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  setConfirming(false);
                  onClose();
                }}
              >
                {confirmClose.confirmLabel ?? "Discard"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
