import { ChevronsDownUpIcon, ChevronsUpDownIcon, LayoutGridIcon, SearchIcon } from "lucide-react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Props = {
  query: string;
  onQueryChange: (value: string) => void;
  compact: boolean;
  onToggleCompact: () => void;
  anyOpen: boolean;
  onToggleAll: () => void;
};

export function Toolbar({
  query,
  onQueryChange,
  compact,
  onToggleCompact,
  anyOpen,
  onToggleAll,
}: Props) {
  return (
    <div className="bg-background/85 border-border sticky top-0 z-20 flex items-center gap-2 border-b px-4 pt-[calc(env(safe-area-inset-top,0px)+0.625rem)] pb-2.5 backdrop-blur-lg">
      <div className="relative flex-1">
        <SearchIcon
          className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2"
          aria-hidden
        />
        <Input
          type="search"
          inputMode="search"
          autoComplete="off"
          placeholder="Search things…"
          className="pl-8"
          value={query}
          onChange={(event) => {
            onQueryChange(event.target.value);
          }}
          aria-label="Search things"
        />
      </div>

      <IconToggle
        label={anyOpen ? "Collapse all sections" : "Expand all sections"}
        onClick={onToggleAll}
      >
        {anyOpen ? (
          <ChevronsDownUpIcon className="size-4" />
        ) : (
          <ChevronsUpDownIcon className="size-4" />
        )}
      </IconToggle>

      <IconToggle
        label={compact ? "Show labels" : "Hide labels"}
        pressed={compact}
        onClick={onToggleCompact}
      >
        <LayoutGridIcon className="size-4" />
      </IconToggle>
    </div>
  );
}

function IconToggle({
  label,
  pressed,
  onClick,
  children,
}: {
  label: string;
  pressed?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      className={cn(
        "border-border flex size-9 shrink-0 items-center justify-center rounded-md border transition-colors",
        pressed ? "bg-primary text-primary-foreground border-transparent" : "text-muted-foreground",
      )}
    >
      {children}
    </button>
  );
}
