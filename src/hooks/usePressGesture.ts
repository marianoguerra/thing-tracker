import { useCallback, useEffect, useRef, type PointerEvent as ReactPointerEvent } from "react";

type Options = {
  onTap: () => void;
  onLongPress?: () => void;
  longPressMs?: number;
  /** Movement past this (px) cancels the gesture — that's what lets you scroll. */
  moveTolerance?: number;
  disabled?: boolean;
};

/**
 * Tap vs long-press on the same element, built on pointer events.
 *
 * The details that matter on a phone:
 * - Movement past a small threshold cancels everything, so dragging to scroll
 *   over a grid of buttons doesn't log anything. This is the single most
 *   important behaviour here.
 * - No `setPointerCapture`. Capturing would route subsequent pointer events to
 *   this element and swallow the scroll gesture entirely.
 * - After a long-press fires, the following click is suppressed, otherwise the
 *   tap handler runs too and you get both actions from one press.
 * - `contextmenu` is prevented, which kills the iOS long-press callout and the
 *   Android context menu.
 * - Keyboard parity: Enter/Space tap, Shift+Enter and the context-menu key
 *   long-press, so the gesture is not the only way in.
 */
export function usePressGesture({
  onTap,
  onLongPress,
  longPressMs = 450,
  moveTolerance = 10,
  disabled = false,
}: Options) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const originRef = useRef<{ id: number; x: number; y: number } | null>(null);
  const firedRef = useRef(false);
  // Reads happen inside timers and native listeners, so keep them fresh
  // without re-binding handlers on every render.
  const onTapRef = useRef(onTap);
  const onLongPressRef = useRef(onLongPress);
  onTapRef.current = onTap;
  onLongPressRef.current = onLongPress;

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const cancel = useCallback(() => {
    clearTimer();
    originRef.current = null;
  }, [clearTimer]);

  useEffect(() => cancel, [cancel]);

  const onPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      if (disabled || !event.isPrimary || event.button !== 0) return;

      firedRef.current = false;
      originRef.current = { id: event.pointerId, x: event.clientX, y: event.clientY };

      if (!onLongPressRef.current) return;
      clearTimer();
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        if (!originRef.current) return;
        firedRef.current = true;
        navigator.vibrate?.(10);
        onLongPressRef.current?.();
      }, longPressMs);
    },
    [disabled, longPressMs, clearTimer],
  );

  const onPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      const origin = originRef.current;
      if (!origin || origin.id !== event.pointerId) return;
      const dx = event.clientX - origin.x;
      const dy = event.clientY - origin.y;
      if (Math.hypot(dx, dy) > moveTolerance) cancel();
    },
    [cancel, moveTolerance],
  );

  const onPointerUp = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      const origin = originRef.current;
      originRef.current = null;
      const longPressPending = timerRef.current !== null;
      clearTimer();

      if (firedRef.current) {
        // Long-press already ran; stop the synthetic click from tapping too.
        event.preventDefault();
        return;
      }
      if (origin && origin.id === event.pointerId && longPressPending) onTapRef.current();
      // No pending timer means the move threshold cancelled it — a scroll.
    },
    [clearTimer],
  );

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLElement>) => {
      if (disabled) return;
      if (event.key === "Enter" && event.shiftKey) {
        event.preventDefault();
        onLongPressRef.current?.();
        return;
      }
      if (event.key === "ContextMenu") {
        event.preventDefault();
        onLongPressRef.current?.();
        return;
      }
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        onTapRef.current();
      }
    },
    [disabled],
  );

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel: cancel,
    onPointerLeave: cancel,
    onKeyDown,
    onContextMenu: (event: React.MouseEvent) => {
      event.preventDefault();
    },
    onClick: (event: React.MouseEvent) => {
      // Belt and braces: some browsers still deliver a click after a
      // long-press even with the pointerup preventDefault above.
      if (firedRef.current) {
        event.preventDefault();
        event.stopPropagation();
        firedRef.current = false;
      }
    },
  };
}
