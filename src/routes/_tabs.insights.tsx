import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_tabs/insights")({ component: InsightsRoute });

function InsightsRoute() {
  return (
    <div className="p-4">
      <h1 className="text-xl font-semibold tracking-tight">Insights</h1>
      <p className="text-muted-foreground mt-1 text-sm">Your days, weeks and months.</p>
    </div>
  );
}
