import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import type { Measurement } from "@/db/schema";
import { cn } from "@/lib/utils";

export type ThingMeasurementDraft = { measurementId: string; unit?: string };

type Props = {
  measurements: readonly Measurement[];
  value: ThingMeasurementDraft[];
  onChange: (next: ThingMeasurementDraft[]) => void;
};

/**
 * Chooses which quantities a thing records, and in which unit.
 *
 * The unit is per-thing rather than per-measurement because it belongs to the
 * pairing: a plank is seconds and a night's sleep is hours, but both are
 * Duration — and someone tracking runs in miles may still weigh in kilograms.
 */
export function MeasurementPicker({ measurements, value, onChange }: Props) {
  const selected = new Map(value.map((entry) => [entry.measurementId, entry]));

  function toggle(measurement: Measurement, on: boolean) {
    onChange(
      on
        ? [...value, { measurementId: measurement.id, unit: measurement.defaultUnit }]
        : value.filter((entry) => entry.measurementId !== measurement.id),
    );
  }

  function setUnit(measurementId: string, unit: string) {
    onChange(
      value.map((entry) => (entry.measurementId === measurementId ? { ...entry, unit } : entry)),
    );
  }

  return (
    <ul className="space-y-1">
      {[...measurements]
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((measurement) => {
          const entry = selected.get(measurement.id);
          const checkboxId = `measure-${measurement.id}`;
          return (
            <li key={measurement.id}>
              <div className="flex items-center gap-3 py-1">
                <Checkbox
                  id={checkboxId}
                  checked={entry !== undefined}
                  onCheckedChange={(next) => toggle(measurement, next === true)}
                />
                <Label htmlFor={checkboxId} className="flex flex-1 items-center gap-2 font-normal">
                  {measurement.emoji && (
                    <span className="emoji" aria-hidden>
                      {measurement.emoji}
                    </span>
                  )}
                  {measurement.name}
                </Label>
              </div>

              {entry && measurement.units.length > 1 && (
                <div className="flex flex-wrap gap-1 pb-1.5 pl-9">
                  {measurement.units.map((unit) => (
                    <button
                      key={unit.id}
                      type="button"
                      aria-pressed={entry.unit === unit.id}
                      onClick={() => setUnit(measurement.id, unit.id)}
                      className={cn(
                        "rounded-full border px-2 py-0.5 text-[0.6875rem] font-medium",
                        entry.unit === unit.id
                          ? "bg-primary text-primary-foreground border-transparent"
                          : "border-border text-muted-foreground",
                      )}
                    >
                      {unit.label}
                    </button>
                  ))}
                </div>
              )}
            </li>
          );
        })}
    </ul>
  );
}
