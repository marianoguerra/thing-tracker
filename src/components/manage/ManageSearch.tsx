import { SearchIcon } from "lucide-react";

import { Input } from "@/components/ui/input";

/**
 * The filter box shared by every Manage tab.
 *
 * One component so the four tabs behave identically — a list that filters as
 * you type on one tab and not the next is worse than none of them doing it.
 */
export function ManageSearch({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (next: string) => void;
  placeholder: string;
}) {
  return (
    <div className="relative">
      <SearchIcon
        className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2"
        aria-hidden
      />
      <Input
        type="search"
        inputMode="search"
        autoComplete="off"
        className="pl-8"
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-label={placeholder}
      />
    </div>
  );
}

/** Shown in place of a list when a filter matches nothing. */
export function NoMatches({ query }: { query: string }) {
  return (
    <p className="text-muted-foreground py-8 text-center text-sm">Nothing matches “{query}”.</p>
  );
}
