import { useDeferredValue, useMemo, useState } from "react";

import { Input } from "@/components/ui/input";
import { useLocalStorageState } from "@/hooks/useLocalStorageState";
import {
  CATALOG_CATEGORIES,
  CATEGORY_ICONS,
  COMMON_CATEGORY,
  entriesForCategory,
} from "@/lib/emoji/catalog";
import { searchEmoji } from "@/lib/emoji/search";
import { cn } from "@/lib/utils";

const RECENTS_KEY = "tt.emoji.recent.v1";
const MAX_RECENTS = 16;
/**
 * Enough to scroll through without rendering ~1900 buttons for a one-letter
 * query. Anything past this is reachable by typing one more character.
 */
const RENDER_LIMIT = 300;

function parseRecents(raw: unknown): string[] | undefined {
  return Array.isArray(raw) && raw.every((v) => typeof v === "string") ? raw : undefined;
}

/** Records a pick so it surfaces first next time. Exported for other callers. */
export function useEmojiRecents() {
  const [recents, setRecents] = useLocalStorageState<string[]>(RECENTS_KEY, [], parseRecents);
  const remember = (char: string) =>
    setRecents((prev) => [char, ...prev.filter((c) => c !== char)].slice(0, MAX_RECENTS));
  return { recents, remember };
}

type Props = {
  value?: string;
  onSelect: (emoji: string) => void;
  className?: string;
};

export function EmojiPicker({ value, onSelect, className }: Props) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>(COMMON_CATEGORY);
  const deferredQuery = useDeferredValue(query);
  const { recents, remember } = useEmojiRecents();

  const results = useMemo(() => {
    // A category filter alongside an active search would mostly produce empty
    // grids, so searching takes over and the chips step aside.
    if (deferredQuery.trim()) return searchEmoji(deferredQuery);
    return entriesForCategory(category);
  }, [deferredQuery, category]);

  function pick(char: string) {
    remember(char);
    onSelect(char);
  }

  const searching = deferredQuery.trim().length > 0;

  return (
    <div className={cn("flex min-h-0 flex-col gap-3", className)}>
      {/*
        Everything outside the results grid is `shrink-0`: in a height-capped
        flex column the browser will happily squash the chip row and the recents
        strip to a few pixels rather than scroll the grid, which is the one part
        that should absorb the constraint.
      */}
      <Input
        type="search"
        inputMode="search"
        autoComplete="off"
        placeholder="Search emoji…"
        className="shrink-0"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
        }}
        aria-label="Search emoji"
      />

      {/* Wraps rather than scrolls: every category stays reachable at any
          width, with no hidden overflow to discover. */}
      {!searching && (
        <div className="flex shrink-0 flex-wrap justify-center gap-1">
          {CATALOG_CATEGORIES.map((cat) => (
            <CategoryChip
              key={cat}
              label={cat}
              active={category === cat}
              onClick={() => setCategory(cat)}
            >
              {CATEGORY_ICONS[cat] ?? "•"}
            </CategoryChip>
          ))}
        </div>
      )}

      {!searching && recents.length > 0 && (
        <section aria-label="Recently used" className="shrink-0">
          <h3 className="text-muted-foreground mb-1.5 text-xs font-medium">Recent</h3>
          <div className="grid grid-cols-8 gap-1">
            {recents.map((char) => (
              <EmojiCell
                key={char}
                char={char}
                selected={char === value}
                onClick={() => pick(char)}
              />
            ))}
          </div>
        </section>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {results.length === 0 ? (
          <p className="text-muted-foreground py-6 text-center text-sm">
            Nothing matches “{deferredQuery}”. Paste any emoji below instead.
          </p>
        ) : (
          <div className="grid grid-cols-8 gap-1">
            {results.slice(0, RENDER_LIMIT).map((entry) => (
              <EmojiCell
                key={entry.char}
                char={entry.char}
                label={entry.name}
                selected={entry.char === value}
                onClick={() => pick(entry.char)}
              />
            ))}
          </div>
        )}
        {results.length > RENDER_LIMIT && (
          <p className="text-muted-foreground py-3 text-center text-xs">
            Showing {RENDER_LIMIT} of {results.length}. Keep typing to narrow it down.
          </p>
        )}
      </div>

      <div className="shrink-0 space-y-1.5">
        <label htmlFor="emoji-custom" className="text-muted-foreground text-xs font-medium">
          Or paste any emoji
        </label>
        {/*
          The catalog stops at Emoji 15 so nothing renders as tofu, and skips
          skin-tone variants — this is the escape hatch for both.
        */}
        <Input
          id="emoji-custom"
          maxLength={16}
          placeholder="🦆"
          className="emoji w-20 text-center text-lg"
          onChange={(event) => {
            const next = event.target.value.trim();
            if (next) pick(next);
          }}
        />
      </div>
    </div>
  );
}

function CategoryChip({
  active,
  label,
  onClick,
  children,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={label}
      title={label}
      className={cn(
        "emoji flex size-9 shrink-0 items-center justify-center rounded-lg text-lg transition-colors",
        active ? "bg-primary/20 ring-primary ring-2" : "hover:bg-accent",
      )}
    >
      {children}
    </button>
  );
}

function EmojiCell({
  char,
  label,
  selected,
  onClick,
}: {
  char: string;
  label?: string;
  selected?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label ?? char}
      aria-pressed={selected}
      className={cn(
        "emoji flex aspect-square items-center justify-center rounded-md text-xl transition-colors",
        selected ? "bg-primary/15 ring-primary ring-2" : "hover:bg-accent",
      )}
    >
      {char}
    </button>
  );
}
