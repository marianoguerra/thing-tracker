import { useEffect, useState } from "react";

/**
 * The height actually visible to the user, tracking the on-screen keyboard.
 *
 * `100dvh` and `position: fixed` both describe the layout viewport, which does
 * not shrink when a mobile keyboard opens — so a full-screen panel keeps its
 * footer somewhere underneath the keys. `visualViewport` is the only thing that
 * reports the space left over, and it is what keeps a wizard's Next button
 * reachable while typing.
 *
 * Returns undefined where the API is missing, so callers fall back to CSS.
 */
export function useViewportHeight(active: boolean): number | undefined {
  const [height, setHeight] = useState<number | undefined>(undefined);

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!active || !viewport) return;

    const update = () => setHeight(viewport.height);
    update();
    viewport.addEventListener("resize", update);
    // iOS scrolls the visual viewport rather than resizing it in some cases.
    viewport.addEventListener("scroll", update);
    return () => {
      viewport.removeEventListener("resize", update);
      viewport.removeEventListener("scroll", update);
    };
  }, [active]);

  return active ? height : undefined;
}
