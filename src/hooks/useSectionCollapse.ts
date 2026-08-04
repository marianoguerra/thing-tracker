import { useCallback, useMemo } from "react";

import { useLocalStorageState } from "./useLocalStorageState";

const STORAGE_KEY = "tt.sections.v1";

function parseCollapsed(raw: unknown): string[] | undefined {
  return Array.isArray(raw) && raw.every((v) => typeof v === "string") ? raw : undefined;
}

/**
 * Which sections are collapsed, persisted across launches.
 *
 * Stores the collapsed ids rather than the expanded ones so a newly created
 * group shows up open — the opposite would hide new tags until you found the
 * chevron.
 */
export function useSectionCollapse(allIds: readonly string[]) {
  const [collapsedIds, setCollapsedIds] = useLocalStorageState<string[]>(
    STORAGE_KEY,
    [],
    parseCollapsed,
  );

  const collapsed = useMemo(() => new Set(collapsedIds), [collapsedIds]);

  const isOpen = useCallback((id: string) => !collapsed.has(id), [collapsed]);

  const toggle = useCallback(
    (id: string) => {
      setCollapsedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    },
    [setCollapsedIds],
  );

  const anyOpen = allIds.some((id) => !collapsed.has(id));

  /** Collapses everything if anything is open, otherwise expands everything. */
  const toggleAll = useCallback(() => {
    setCollapsedIds((prev) => {
      const current = new Set(prev);
      const open = allIds.filter((id) => !current.has(id));
      if (open.length > 0) {
        // Keep collapsed ids for sections not currently on screen.
        return [...new Set([...prev, ...allIds])];
      }
      return prev.filter((id) => !allIds.includes(id));
    });
  }, [allIds, setCollapsedIds]);

  return { isOpen, toggle, toggleAll, anyOpen };
}
