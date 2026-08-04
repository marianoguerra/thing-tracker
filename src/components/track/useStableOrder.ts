import { useCallback, useEffect, useRef, useState } from "react";

import type { Thing } from "@/db/schema";
import { rankThings, type UsageIndex } from "@/domain/ranking";

/**
 * Freezes the frequency ordering for the duration of a session.
 *
 * Ordering by usage is what puts the emoji you reach for most under your thumb,
 * but recomputing it live fights the same goal: log something twice and its
 * button climbs past its neighbours mid-session, so the next tap lands on the
 * wrong thing. Muscle memory is worth more than a perfectly current sort.
 *
 * The order is therefore recomputed only at moments where the user cannot be
 * mid-tap: the first render that actually has data, and whenever the app is
 * returned to after being hidden or backgrounded.
 */
export function useStableOrder(things: readonly Thing[], usage: UsageIndex): string[] {
  const [order, setOrder] = useState<string[]>([]);

  // Latest inputs, read at re-rank time rather than captured per effect.
  const latest = useRef({ things, usage });
  latest.current = { things, usage };

  // Both collections start empty and populate on later ticks, and the derived
  // usage query lands after `things`. Ranking on mount alone freezes an empty
  // order; ranking as soon as `things` arrives freezes an alphabetical one,
  // because every count is still zero. Both look exactly like the frequency
  // sort being broken, so each source gets a one-time "we have it now" rank.
  const rankedRef = useRef(false);
  const rankedWithUsageRef = useRef(false);

  const rerank = useCallback(() => {
    const { things: current, usage: currentUsage } = latest.current;
    if (current.length === 0) return;
    rankedRef.current = true;
    if (currentUsage.size > 0) rankedWithUsageRef.current = true;
    setOrder(rankThings(current, currentUsage).map((thing) => thing.id));
  }, []);

  // One-time transitions only — never a live re-sort.
  const pendingFirstRank =
    (things.length > 0 && !rankedRef.current) || (usage.size > 0 && !rankedWithUsageRef.current);
  useEffect(() => {
    if (pendingFirstRank) rerank();
  }, [pendingFirstRank, rerank]);

  // Re-rank when the user comes back, never while they are here.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") rerank();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", rerank);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", rerank);
    };
  }, [rerank]);

  // Things created after the first rank get appended rather than sorted in, so
  // creating one doesn't reshuffle the grid you were just using.
  const missing = rankedRef.current && things.some((thing) => !order.includes(thing.id));
  useEffect(() => {
    if (!missing) return;
    setOrder((prev) => {
      const seen = new Set(prev);
      return [...prev, ...latest.current.things.filter((t) => !seen.has(t.id)).map((t) => t.id)];
    });
  }, [missing]);

  return order;
}
