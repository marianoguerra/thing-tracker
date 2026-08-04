import { useLiveQuery } from "@tanstack/react-db";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { BundleBrowser } from "@/components/manage/BundleBrowser";
import { DataPanel } from "@/components/manage/DataPanel";
import { GroupEditorDrawer, type GroupEditorState } from "@/components/manage/GroupEditorDrawer";
import { GroupsPanel } from "@/components/manage/GroupsPanel";
import { ImportPreviewDialog } from "@/components/manage/ImportPreviewDialog";
import { ThingsPanel } from "@/components/manage/ThingsPanel";
import { useImportFlow } from "@/components/manage/useImportFlow";
import { ThingEditorDrawer, type ThingEditorState } from "@/components/thing/ThingEditorDrawer";
import { useCollections, useDb } from "@/db/provider";
import type { Group } from "@/db/schema";
import { createGroup, deleteGroup, setGroupMembership, updateGroup } from "@/domain/groups";
import { createThing, deleteThing, updateThing } from "@/domain/things";
import { saveOrShare } from "@/lib/file";
import { cn } from "@/lib/utils";
import { fetchBundlePack } from "@/transfer/bundles";
import { buildPack, packFilename } from "@/transfer/export";

export const MANAGE_TABS = ["things", "groups", "bundles", "data"] as const;
const LABELS: Record<(typeof MANAGE_TABS)[number], string> = {
  things: "Things",
  groups: "Tags",
  bundles: "Bundles",
  data: "Data",
};

const searchSchema = z.object({
  tab: z.enum(MANAGE_TABS).default("things").catch("things"),
});

export const Route = createFileRoute("/_tabs/manage")({
  validateSearch: searchSchema,
  component: ManageRoute,
});

function ManageRoute() {
  const { tab } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const { db } = useDb();
  const collections = useCollections();
  const importFlow = useImportFlow();

  const [thingEditor, setThingEditor] = useState<ThingEditorState | null>(null);
  const [groupEditor, setGroupEditor] = useState<GroupEditorState | null>(null);

  // Only `things` is needed here — each panel runs its own query for the rest.
  const { data: things } = useLiveQuery((q) => q.from({ thing: collections.things }));

  const installedBundleIds = useMemo(
    () => new Set(things.map((thing) => thing.bundleId).filter((id): id is string => !!id)),
    [things],
  );

  async function shareGroup(group: Group) {
    const pack = buildPack([group], things);
    await saveOrShare(JSON.stringify(pack, null, 2), packFilename([group]));
  }

  return (
    <>
      <div className="bg-background/85 border-border sticky top-0 z-20 border-b px-4 pt-[calc(env(safe-area-inset-top,0px)+0.625rem)] pb-2.5 backdrop-blur-lg">
        <div className="bg-muted flex rounded-lg p-0.5 text-sm font-medium">
          {MANAGE_TABS.map((name) => (
            <button
              key={name}
              type="button"
              aria-current={tab === name ? "page" : undefined}
              onClick={() => {
                void navigate({ search: { tab: name }, replace: true });
              }}
              className={cn(
                "flex-1 rounded-md px-2 py-1.5 transition-colors",
                tab === name ? "bg-background text-foreground shadow-sm" : "text-muted-foreground",
              )}
            >
              {LABELS[name]}
            </button>
          ))}
        </div>
      </div>

      {tab === "things" && (
        <ThingsPanel
          onCreate={() => setThingEditor({ mode: "create" })}
          onEdit={(thing) => setThingEditor({ mode: "edit", thing })}
        />
      )}

      {tab === "groups" && (
        <GroupsPanel
          onCreate={() => setGroupEditor({ mode: "create" })}
          onEdit={(group) => setGroupEditor({ mode: "edit", group })}
          onShare={(group) => void shareGroup(group)}
        />
      )}

      {tab === "bundles" && (
        <BundleBrowser
          installedBundleIds={installedBundleIds}
          onLoad={(entry) => {
            fetchBundlePack(entry.file)
              .then((pack) => {
                importFlow.beginPack(pack, entry.title);
              })
              .catch((error: unknown) => {
                toast.error("Couldn't load that bundle", {
                  description: error instanceof Error ? error.message : String(error),
                });
              });
          }}
        />
      )}

      {tab === "data" && <DataPanel onImportText={importFlow.beginFromText} />}

      <ThingEditorDrawer
        state={thingEditor}
        onClose={() => setThingEditor(null)}
        onSave={(draft) => {
          if (thingEditor?.mode === "edit") {
            updateThing(collections, thingEditor.thing.id, draft, {
              clearDuration: draft.duration === undefined,
            });
          } else {
            createThing(collections, draft);
          }
          setThingEditor(null);
        }}
        onDelete={(thing) => {
          deleteThing(collections, thing.id);
          setThingEditor(null);
        }}
      />

      <GroupEditorDrawer
        state={groupEditor}
        onClose={() => setGroupEditor(null)}
        onSave={(draft) => {
          if (groupEditor?.mode === "edit") {
            const group = groupEditor.group;
            updateGroup(collections, group.id, { title: draft.title, emoji: draft.emoji });
            const next = new Set(draft.thingIds);
            void setGroupMembership(db, group.id, {
              add: draft.thingIds.filter((id) => !group.thingIds.includes(id)),
              remove: group.thingIds.filter((id) => !next.has(id)),
            });
          } else {
            const created = createGroup(collections, {
              title: draft.title,
              emoji: draft.emoji,
            });
            if (draft.thingIds.length > 0) {
              void setGroupMembership(db, created.id, { add: draft.thingIds });
            }
          }
          setGroupEditor(null);
        }}
        onDelete={(group) => {
          deleteGroup(collections, group.id);
          setGroupEditor(null);
        }}
      />

      <ImportPreviewDialog
        plan={importFlow.plan}
        title={importFlow.title}
        busy={importFlow.busy}
        overwriteThingDetails={importFlow.overwrite}
        onOverwriteChange={importFlow.setOverwriteThingDetails}
        onConfirm={() => void importFlow.confirm()}
        onCancel={importFlow.cancel}
      />
    </>
  );
}
