import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_tabs/")({ component: TrackRoute });

function TrackRoute() {
  return (
    <div className="p-4">
      <h1 className="text-xl font-semibold tracking-tight">Track</h1>
      <p className="text-muted-foreground mt-1 text-sm">Tap a thing to log it.</p>
    </div>
  );
}
