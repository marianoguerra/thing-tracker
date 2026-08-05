import { useLiveQuery } from "@tanstack/react-db";
import { useDeferredValue, useEffect, useMemo, useState } from "react";

import { EmojiPicker } from "@/components/emoji/EmojiPicker";
import { FullScreenPanel } from "@/components/layout/FullScreenPanel";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCollections } from "@/db/provider";
import type { Group } from "@/db/schema";
import { filterThings } from "@/domain/search";
import { ManageSearch, NoMatches } from "./ManageSearch";

export type GroupEditorState = { mode: "create" } | { mode: "edit"; group: Group };

type Props = {
  state: GroupEditorState | null;
  onClose: () => void;
  onSave: (draft: { title: string; emoji?: string; thingIds: string[] }) => void;
  onDelete?: (group: Group) => void;
};

export function GroupEditorPanel({ state, onClose, onSave, onDelete }: Props) {
  const { things } = useCollections();
  const { data: thingRows } = useLiveQuery((q) => q.from({ thing: things }));

  const [title, setTitle] = useState("");
  const [emoji, setEmoji] = useState<string>("");
  const [members, setMembers] = useState<Set<string>>(new Set());
  const [pickerOpen, setPickerOpen] = useState(false);
  const [thingQuery, setThingQuery] = useState("");
  const deferredThingQuery = useDeferredValue(thingQuery);

  useEffect(() => {
    if (!state) return;
    if (state.mode === "edit") {
      setTitle(state.group.title);
      setEmoji(state.group.emoji ?? "");
      setMembers(new Set(state.group.thingIds));
    } else {
      setTitle("");
      setEmoji("");
      setMembers(new Set());
    }
    setPickerOpen(false);
    setThingQuery("");
  }, [state]);

  const sorted = useMemo(() => {
    // Alphabetical when not searching, and deliberately not selected-first:
    // reordering on tick would move the next checkbox out from under the
    // finger that just tapped one.
    if (deferredThingQuery.trim()) return filterThings(thingRows, deferredThingQuery);
    return [...thingRows].sort((a, b) => a.title.localeCompare(b.title));
  }, [thingRows, deferredThingQuery]);

  const editing = state?.mode === "edit" ? state.group : null;

  return (
    <FullScreenPanel
      open={state !== null}
      title={editing ? "Edit tag" : "New tag"}
      description="Pick which things this tag collects."
      confirmClose={{
        title: editing ? "Discard changes?" : "Discard this tag?",
        description: "Nothing has been saved yet.",
      }}
      onClose={onClose}
      footer={
        <>
          {editing && onDelete && (
            <Button
              variant="outline"
              className="text-destructive h-12 shrink-0"
              onClick={() => onDelete(editing)}
            >
              Delete
            </Button>
          )}
          <Button
            className="h-12 flex-1 text-base"
            disabled={title.trim().length === 0}
            onClick={() => {
              onSave({
                title: title.trim(),
                emoji: emoji || undefined,
                thingIds: [...members],
              });
            }}
          >
            {editing ? "Save" : "Create"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="group-emoji">Emoji</Label>
            <button
              id="group-emoji"
              type="button"
              onClick={() => setPickerOpen((open) => !open)}
              aria-expanded={pickerOpen}
              className="emoji border-border text-muted-foreground flex size-11 items-center justify-center rounded-xl border text-2xl"
            >
              {emoji || "＋"}
            </button>
          </div>
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="group-title">Name</Label>
            <Input
              id="group-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Morning routine"
              autoComplete="off"
              className="h-11"
            />
          </div>
        </div>

        {pickerOpen && (
          <EmojiPicker
            value={emoji}
            onSelect={(next) => {
              setEmoji(next);
              setPickerOpen(false);
            }}
            className="max-h-[40vh]"
          />
        )}

        <div className="space-y-1.5">
          <div className="flex items-baseline justify-between">
            <Label>Things</Label>
            {/* Filtering hides ticked rows, so the count is what stops you
                  losing track of what the tag actually holds. */}
            <span className="text-muted-foreground text-xs tabular-nums">
              {members.size} selected
            </span>
          </div>

          {thingRows.length > 0 && (
            <ManageSearch
              value={thingQuery}
              onChange={setThingQuery}
              placeholder="Search things…"
            />
          )}

          <ul className="divide-border/60 divide-y">
            {sorted.map((thing) => (
              <li key={thing.id} className="flex items-center gap-3 py-2">
                <Checkbox
                  id={`member-${thing.id}`}
                  checked={members.has(thing.id)}
                  onCheckedChange={(checked) => {
                    setMembers((prev) => {
                      const next = new Set(prev);
                      if (checked === true) next.add(thing.id);
                      else next.delete(thing.id);
                      return next;
                    });
                  }}
                />
                <Label
                  htmlFor={`member-${thing.id}`}
                  className="flex flex-1 items-center gap-2 font-normal"
                >
                  <span className="emoji text-lg" aria-hidden>
                    {thing.emoji}
                  </span>
                  {thing.title}
                </Label>
              </li>
            ))}
            {sorted.length === 0 && (
              <li>
                {deferredThingQuery.trim() ? (
                  <NoMatches query={deferredThingQuery} />
                ) : (
                  <p className="text-muted-foreground py-4 text-sm">No things to add yet.</p>
                )}
              </li>
            )}
          </ul>
        </div>
      </div>
    </FullScreenPanel>
  );
}
