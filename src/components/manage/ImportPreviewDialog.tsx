import { AlertTriangleIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { isNoopPlan, summarizePlan, type ImportPlan } from "@/transfer/plan";

type Props = {
  plan: ImportPlan | null;
  title: string;
  busy?: boolean;
  overwriteThingDetails: boolean;
  onOverwriteChange: (next: boolean) => void;
  onConfirm: () => void;
  onCancel: () => void;
};

/**
 * Nothing is written until this is confirmed. An import can touch every record
 * on the device, so it states exactly what will change first — including the
 * cases where the honest answer is "nothing".
 */
export function ImportPreviewDialog({
  plan,
  title,
  busy,
  overwriteThingDetails,
  onOverwriteChange,
  onConfirm,
  onCancel,
}: Props) {
  const noop = plan ? isNoopPlan(plan) : false;
  const replacing = plan?.mode === "replace";

  return (
    <Dialog open={plan !== null} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {noop
              ? "You already have every thing in this file."
              : "Here's what will change on this device."}
          </DialogDescription>
        </DialogHeader>

        {plan && (
          <div className="space-y-4">
            <ul className="space-y-1 text-sm">
              {summarizePlan(plan).map((line) => (
                <li key={line} className="flex gap-2">
                  <span aria-hidden className="text-muted-foreground">
                    ·
                  </span>
                  {line}
                </li>
              ))}
            </ul>

            {plan.warnings.map((warning) => (
              <p key={warning} className="text-muted-foreground flex gap-2 text-xs" role="status">
                <AlertTriangleIcon className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                {warning}
              </p>
            ))}

            {/*
              Shown even when the plan is currently a no-op: for someone who
              already has every thing in the file, ticking this is the only
              thing that can turn an updated bundle into an actual change.
              Hiding it here left no way to pick up a new measurement at all.
            */}
            {plan.kind === "pack" && plan.things.unchanged.length > 0 && (
              <div className="flex items-start gap-2">
                <Checkbox
                  id="overwrite-details"
                  checked={overwriteThingDetails}
                  onCheckedChange={(next) => onOverwriteChange(next === true)}
                />
                <div className="grid gap-1">
                  <Label htmlFor="overwrite-details" className="text-sm font-normal">
                    Update details of things I already have
                  </Label>
                  <p className="text-muted-foreground text-xs">
                    Names, emoji and what gets recorded — so ticking this is how an updated bundle
                    adds a measurement to a thing you already have. Off by default: your own edits
                    win. Ids never change either way, so entries you&apos;ve already recorded stay
                    attached.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            disabled={busy || noop}
            variant={replacing ? "destructive" : "default"}
          >
            {replacing ? "Replace everything" : "Import"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
