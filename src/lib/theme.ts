import { useSyncExternalStore } from "react";

export type ThemePreference = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

const STORAGE_KEY = "tt.theme.v1";

const listeners = new Set<() => void>();
const media =
  typeof window === "undefined" ? null : window.matchMedia("(prefers-color-scheme: dark)");

function emit() {
  for (const l of listeners) l();
}

export function readPreference(): ThemePreference {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw === "light" || raw === "dark" ? raw : "system";
}

export function resolveTheme(pref: ThemePreference): ResolvedTheme {
  if (pref !== "system") return pref;
  return media?.matches ? "dark" : "light";
}

/**
 * Applies the resolved theme to <html>. Kept as a standalone function so the
 * inline boot script in index.html can do the same thing before first paint —
 * doing it in an effect would flash the wrong theme on every cold start.
 */
export function applyTheme(pref: ThemePreference) {
  const resolved = resolveTheme(pref);
  document.documentElement.classList.toggle("dark", resolved === "dark");
  document.documentElement.style.colorScheme = resolved;
  // Keep the address-bar / status-bar tint in step with the actual background.
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", resolved === "dark" ? "#09090b" : "#ffffff");
}

export function setThemePreference(pref: ThemePreference) {
  if (pref === "system") localStorage.removeItem(STORAGE_KEY);
  else localStorage.setItem(STORAGE_KEY, pref);
  applyTheme(pref);
  emit();
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  const onMedia = () => {
    // Only a "system" preference should follow the OS.
    if (readPreference() === "system") applyTheme("system");
    onChange();
  };
  media?.addEventListener("change", onMedia);
  return () => {
    listeners.delete(onChange);
    media?.removeEventListener("change", onMedia);
  };
}

export function useThemePreference(): ThemePreference {
  return useSyncExternalStore(subscribe, readPreference, () => "system" as const);
}

export function useResolvedTheme(): ResolvedTheme {
  return useSyncExternalStore(
    subscribe,
    () => resolveTheme(readPreference()),
    () => "light" as const,
  );
}
