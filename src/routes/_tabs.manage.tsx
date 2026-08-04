import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

export const MANAGE_TABS = ["things", "groups", "bundles", "data"] as const;

const searchSchema = z.object({
  tab: z.enum(MANAGE_TABS).default("things"),
});

export const Route = createFileRoute("/_tabs/manage")({
  validateSearch: searchSchema,
  component: ManageRoute,
});

function ManageRoute() {
  const { tab } = Route.useSearch();

  return (
    <div className="p-4">
      <h1 className="text-xl font-semibold tracking-tight">Manage</h1>
      <p className="text-muted-foreground mt-1 text-sm">Current tab: {tab}</p>
    </div>
  );
}
