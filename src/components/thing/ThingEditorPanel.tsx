import { ArrowLeftIcon, Trash2Icon } from "lucide-react";
import { useEffect, useState } from "react";

import { EmojiPicker } from "@/components/emoji/EmojiPicker";
import { FullScreenPanel } from "@/components/layout/FullScreenPanel";
import { Button } from "@/components/ui/button";
import { useLiveQuery } from "@tanstack/react-db";

import {
  MeasurementPicker,
  type ThingMeasurementDraft,
} from "@/components/measure/MeasurementPicker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCollections } from "@/db/provider";
import type { Thing } from "@/db/schema";

const DEFAULT_EMOJI = "⭐";

export type ThingEditorState = { mode: "create"; title?: string } | { mode: "edit"; thing: Thing };

export type ThingDraftValues = {
  emoji: string;
  title: string;
  description?: string;
  measurements: ThingMeasurementDraft[];
};

type Props = {
  state: ThingEditorState | null;
  onClose: () => void;
  onSave: (draft: ThingDraftValues) => void;
  onDelete?: (thing: Thing) => void;
  /** Emoji already used by things sharing a group, for the clash warning. */
  siblingEmoji?: Map<string, string>;
};

export function ThingEditorPanel({ state, onClose, onSave, onDelete, siblingEmoji }: Props) {
  const [emoji, setEmoji] = useState(DEFAULT_EMOJI);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [measurements, setMeasurements] = useState<ThingMeasurementDraft[]>([]);
  const [step, setStep] = useState(0);

  const { measurements: measurementCollection } = useCollections();
  const { data: available } = useLiveQuery((q) => q.from({ measurement: measurementCollection }));

  useEffect(() => {
    if (!state) return;
    if (state.mode === "edit") {
      setEmoji(state.thing.emoji);
      setTitle(state.thing.title);
      setDescription(state.thing.description ?? "");
      setMeasurements(state.thing.measurements.map((m) => ({ ...m })));
    } else {
      setEmoji(DEFAULT_EMOJI);
      setTitle(state.title ?? "");
      setDescription("");
      setMeasurements([]);
    }
    setPickerOpen(state.mode === "create");
    setStep(0);
  }, [state]);

  const clashesWith = siblingEmoji?.get(emoji);
  const editing = state?.mode === "edit" ? state.thing : null;
  const canSave = title.trim().length > 0 && emoji.length > 0;

  /** One field group per screen, creating or editing alike. */
  const STEPS = ["Name & emoji", "What to record", "Notes"] as const;
  const last = step === STEPS.length - 1;
  const show = (index: number) => step === index;
  const canAdvance = step === 0 ? canSave : true;

  function commit() {
    onSave({
      emoji,
      title: title.trim(),
      description: description.trim() || undefined,
      measurements,
    });
  }

  return (
    <FullScreenPanel
      open={state !== null}
      title={editing ? "Edit thing" : "New thing"}
      description={STEPS[step]}
      headerExtra={
        <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
          {step + 1} of {STEPS.length}
        </span>
      }
      progress={(step + 1) / STEPS.length}
      confirmClose={{
        title: editing ? "Discard changes?" : "Discard this thing?",
        description: "Nothing has been saved yet.",
      }}
      onClose={onClose}
      footer={
        <>
          {/*
            Icon-only, and on every step rather than just the last: deleting is
            a single-purpose act, so it should not require paging to the end —
            but three full-width buttons do not fit a 320px footer.
          */}
          {editing && onDelete && (
            <Button
              variant="outline"
              size="icon"
              aria-label={`Delete ${editing.title}`}
              className="text-destructive size-12 shrink-0"
              onClick={() => onDelete(editing)}
            >
              <Trash2Icon />
            </Button>
          )}
          {step > 0 && (
            <Button
              variant="outline"
              className="h-12 shrink-0"
              onClick={() => setStep((n) => n - 1)}
            >
              <ArrowLeftIcon /> Back
            </Button>
          )}
          <Button
            className="h-12 flex-1 text-base"
            disabled={!canAdvance}
            onClick={() => {
              if (last) commit();
              else setStep((n) => n + 1);
            }}
          >
            {last ? (editing ? "Save" : "Create") : "Next"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {show(0) && (
          <>
            {/*
            `items-start` with matching control heights, not `items-end`:
            aligning the bottoms of two columns whose controls differ in height
            leaves the labels sitting at different heights.
          */}
            <div className="flex items-start gap-3">
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
                  className="h-14 text-base"
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
                className="max-h-[45vh]"
              />
            )}
          </>
        )}

        {show(1) && (
          <div className="space-y-1.5">
            <Label>Record a value when logging</Label>
            <p className="text-muted-foreground text-xs">
              Leave all unticked and one tap logs it outright. Tick any and tapping asks for them
              first, pre-filled with last time&apos;s.
            </p>
            <MeasurementPicker
              measurements={available}
              value={measurements}
              onChange={setMeasurements}
            />
          </div>
        )}

        {show(2) && (
          <div className="space-y-1.5">
            <Label htmlFor="thing-description">Notes (optional)</Label>
            <Textarea
              id="thing-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="What counts as one of these?"
              rows={3}
            />
          </div>
        )}
      </div>
    </FullScreenPanel>
  );
}
