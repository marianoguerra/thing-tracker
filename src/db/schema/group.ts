import { z } from "zod";

import { newId } from "@/lib/id";
import { compact } from "@/lib/object";
import { BundleId, Emoji, HexColor, LongText, ShortText, Timestamp, Uuid } from "./primitives";
import { toRxSchema } from "./to-rx-schema";

/**
 * A group behaves as a tag: local, per-user and purely organisational. Two
 * people can file the same thing under completely different groups.
 *
 * Membership lives here as `thingIds` rather than on the thing, because the
 * group is the unit that gets exported and shared — keeping membership on the
 * group means a share pack is a self-contained document, and importing one
 * never rewrites anybody's things.
 */
export const GroupSchema = z.object({
  id: Uuid,
  title: ShortText,
  description: LongText.optional(),
  emoji: Emoji.optional(),
  color: HexColor.optional(),
  sortOrder: z.number().min(0).max(1_000_000).multipleOf(1),
  thingIds: z.array(Uuid),
  bundleId: BundleId.optional(),
  createdAt: Timestamp,
  updatedAt: Timestamp,
});

export type Group = z.infer<typeof GroupSchema>;

export const groupRxSchema = toRxSchema(GroupSchema, {
  version: 0,
  primaryKey: "id",
  indexes: ["sortOrder", "updatedAt"],
});

export function newGroup(input: Pick<Group, "title"> & Partial<Omit<Group, "title">>): Group {
  const now = Date.now();
  return compact({
    id: input.id ?? newId(),
    title: input.title,
    description: input.description,
    emoji: input.emoji,
    color: input.color,
    sortOrder: input.sortOrder ?? 0,
    thingIds: input.thingIds ?? [],
    bundleId: input.bundleId,
    createdAt: input.createdAt ?? now,
    updatedAt: input.updatedAt ?? now,
  });
}
