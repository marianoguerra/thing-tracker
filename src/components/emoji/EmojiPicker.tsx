import { useDeferredValue, useMemo, useState } from "react";

import { Input } from "@/components/ui/input";
import { useLocalStorageState } from "@/hooks/useLocalStorageState";
import { EMOJI_CATEGORIES, type EmojiCategory } from "@/lib/emoji/palette";
import { searchEmoji } from "@/lib/emoji/search";
import { cn } from "@/lib/utils";

const RECENTS_KEY = "tt.emoji.recent.v1";
const MAX_RECENTS = 16;

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
  const [category, setCategory] = useState<EmojiCategory | null>(null);
  const deferredQuery = useDeferredValue(query);
  const { recents, remember } = useEmojiRecents();

  const results = useMemo(() => {
    const matches = searchEmoji(deferredQuery);
    // A category filter alongside an active search would mostly produce empty
    // grids, so searching takes over and the chips step aside.
    if (deferredQuery.trim() || !category) return matches;
    return matches.filter((entry) => entry.category === category);
  }, [deferredQuery, category]);

  function pick(char: string) {
    remember(char);
    onSelect(char);
  }

  const searching = deferredQuery.trim().length > 0;

  return (
    <div className={cn("flex min-h-0 flex-col gap-3", className)}>
      <Input
        type="search"
        inputMode="search"
        autoComplete="off"
        placeholder="Search emoji…"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
        }}
        aria-label="Search emoji"
      />

      {!searching && (
        <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
          <CategoryChip active={category === null} onClick={() => setCategory(null)}>
            All
          </CategoryChip>
          {EMOJI_CATEGORIES.map((cat) => (
            <CategoryChip key={cat} active={category === cat} onClick={() => setCategory(cat)}>
              {cat}
            </CategoryChip>
          ))}
        </div>
      )}

      {!searching && recents.length > 0 && (
        <section aria-label="Recently used">
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
            {results.map((entry) => (
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
      </div>

      <div className="space-y-1.5">
        <label htmlFor="emoji-custom" className="text-muted-foreground text-xs font-medium">
          Or paste any emoji
        </label>
        {/*
          The palette is curated, not exhaustive — this is the escape hatch for
          anything it does not carry.
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
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "shrink-0 rounded-full border px-3 py-1 text-xs font-medium whitespace-nowrap transition-colors",
        active
          ? "bg-primary text-primary-foreground border-transparent"
          : "border-border text-muted-foreground",
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
