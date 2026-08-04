import { useEffect, useState } from "react";

import { EmojiPicker } from "@/components/emoji/EmojiPicker";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Thing } from "@/db/schema";

const DEFAULT_EMOJI = "⭐";

export type ThingEditorState = { mode: "create"; title?: string } | { mode: "edit"; thing: Thing };

type Props = {
  state: ThingEditorState | null;
  onClose: () => void;
  onSave: (draft: { emoji: string; title: string; description?: string }) => void;
  onDelete?: (thing: Thing) => void;
  /** Emoji already used by things sharing a group, for the clash warning. */
  siblingEmoji?: Map<string, string>;
};

export function ThingEditorDrawer({ state, onClose, onSave, onDelete, siblingEmoji }: Props) {
  const [emoji, setEmoji] = useState(DEFAULT_EMOJI);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    if (!state) return;
    if (state.mode === "edit") {
      setEmoji(state.thing.emoji);
      setTitle(state.thing.title);
      setDescription(state.thing.description ?? "");
    } else {
      setEmoji(DEFAULT_EMOJI);
      setTitle(state.title ?? "");
      setDescription("");
    }
    setPickerOpen(state.mode === "create");
  }, [state]);

  const clashesWith = siblingEmoji?.get(emoji);
  const editing = state?.mode === "edit" ? state.thing : null;
  const canSave = title.trim().length > 0 && emoji.length > 0;

  return (
    <Drawer open={state !== null} onOpenChange={(open) => !open && onClose()}>
      <DrawerContent className="max-h-[92vh]">
        <DrawerHeader className="pb-2">
          <DrawerTitle>{editing ? "Edit thing" : "New thing"}</DrawerTitle>
          <DrawerDescription>
            The emoji is how you&apos;ll recognise it when tapping fast.
          </DrawerDescription>
        </DrawerHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4">
          <div className="flex items-end gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="thing-emoji">Emoji</Label>
              <button
                id="thing-emoji"
                type="button"
                onClick={() => setPickerOpen((open) => !open)}
                aria-expanded={pickerOpen}
                className="emoji border-border flex size-14 items-center justify-center rounded-xl border text-3xl"
              >
                {emoji}
              </button>
            </div>
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="thing-title">Name</Label>
              <Input
                id="thing-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Coffee"
                autoComplete="off"
                enterKeyHint="done"
              />
            </div>
          </div>

          {clashesWith && (
            <p className="text-muted-foreground text-xs">
              <span className="emoji">{emoji}</span> is already used by{" "}
              <strong className="font-medium">{clashesWith}</strong> in one of the same groups —
              still fine, just harder to tell apart at a glance.
            </p>
          )}

          {pickerOpen && (
            <EmojiPicker
              value={emoji}
              onSelect={(next) => {
                setEmoji(next);
                setPickerOpen(false);
              }}
              className="max-h-72"
            />
          )}

          <div className="space-y-1.5">
            <Label htmlFor="thing-description">Notes (optional)</Label>
            <Textarea
              id="thing-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="What counts as one of these?"
              rows={2}
            />
          </div>
        </div>

        <DrawerFooter className="gap-2">
          <Button
            disabled={!canSave}
            onClick={() => {
              onSave({ emoji, title: title.trim(), description: description.trim() || undefined });
            }}
          >
            {editing ? "Save" : "Create"}
          </Button>
          {editing && onDelete && (
            <Button variant="ghost" className="text-destructive" onClick={() => onDelete(editing)}>
              Delete thing
            </Button>
          )}
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
