import type { AppCollectionsCtx } from "@/db/collections";
import type { AppDatabase } from "@/db/database";
import { setGroupMembership } from "@/domain/groups";
import type { BackupEnvelope } from "./envelope";
import type { ImportPlan, LocalSnapshot } from "./plan";

export function snapshot(collections: AppCollectionsCtx): LocalSnapshot {
  return {
    things: [...collections.things.toArray],
    groups: [...collections.groups.toArray],
    events: [...collections.events.toArray],
    measurements: [...collections.measurements.toArray],
  };
}

export type ApplyResult = {
  thingsCreated: number;
  thingsUpdated: number;
  groupsCreated: number;
  groupsMerged: number;
  eventsCreated: number;
};

/**
 * Executes a plan. Everything user-visible was already decided and confirmed
 * during planning; this only writes.
 */
export async function applyImport(
  plan: ImportPlan,
  db: AppDatabase,
  collections: AppCollectionsCtx,
  attachments: BackupEnvelope["attachments"] = [],
): Promise<ApplyResult> {
  if (plan.mode === "replace") {
    // Ordered children-first so nothing transiently references a missing
    // parent if the wipe is interrupted.
    await db.events.find().remove();
    await db.groups.find().remove();
    await db.things.find().remove();
    // Measurements are deliberately kept: the predefined ones are re-seeded on
    // every open anyway, and wiping them would orphan the incoming values.
  }

  // Measurements first: a thing that references a scale is meaningless until
  // the scale exists.
  if (plan.measurements.create.length) collections.measurements.insert(plan.measurements.create);

  if (plan.things.create.length) collections.things.insert(plan.things.create);
  for (const thing of plan.things.update) {
    collections.things.update(thing.id, (draft) => {
      Object.assign(draft, thing);
    });
  }

  if (plan.groups.create.length) collections.groups.insert(plan.groups.create);
  for (const group of plan.groups.replace) {
    collections.groups.update(group.id, (draft) => {
      Object.assign(draft, group);
    });
  }

  // Membership goes through incrementalModify so a concurrent tab tagging the
  // same group cannot lose its write to a whole-array overwrite.
  for (const merge of plan.groups.mergeInto) {
    await setGroupMembership(db, merge.id, { add: merge.addedThingIds });
  }

  if (plan.events.create.length) collections.events.insert(plan.events.create);

  if (attachments.length > 0) {
    const wanted = new Set(plan.events.create.map((event) => event.id));
    for (const attachment of attachments) {
      if (!wanted.has(attachment.eventId)) continue;
      const doc = await db.events.findOne(attachment.eventId).exec();
      if (!doc) continue;
      await doc.putAttachmentBase64({
        id: attachment.attachmentId,
        data: attachment.data,
        type: attachment.mimeType,
        length: attachment.length,
      });
    }
  }

  return {
    thingsCreated: plan.things.create.length,
    thingsUpdated: plan.things.update.length,
    groupsCreated: plan.groups.create.length,
    groupsMerged: plan.groups.mergeInto.length + plan.groups.replace.length,
    eventsCreated: plan.events.create.length,
  };
}
