import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_tabs/manage")({ component: ManageRoute });

function ManageRoute() {
  return (
    <div className="p-4">
      <h1 className="text-xl font-semibold tracking-tight">Manage</h1>
      <p className="text-muted-foreground mt-1 text-sm">Things, tags, bundles and data.</p>
    </div>
  );
}
