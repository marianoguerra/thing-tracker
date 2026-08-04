import { v5 as uuidv5 } from "uuid";

// Relative, extension-bearing imports: this module is shared with
// scripts/build-bundles.ts, which runs under plain Node where the `@/` alias
// does not exist. Type-only imports are erased, so only ./format.ts is pulled
// in at runtime — and it is dependency-free for exactly that reason.
import type { Group, Thing } from "../db/schema/index.ts";
import type { PackEnvelope } from "../transfer/envelope.ts";
import { PACK_FORMAT } from "../transfer/format.ts";
import { BUNDLE_NAMESPACE, groupIdName, thingIdName } from "./ids.ts";
import type { BundleDef } from "./types.ts";

/**
 * Fixed so the generated JSON is byte-stable across runs.
 *
 * A wall-clock timestamp would make every rebuild a diff and would defeat the
 * test that regenerates each bundle and compares it to the committed file.
 * Bundles are definitions; the date they were generated carries no meaning.
 */
export const BUNDLE_EPOCH = 0;

export type BuiltBundle = {
  slug: string;
  file: string;
  envelope: PackEnvelope;
};

export function buildBundle(def: BundleDef): BuiltBundle {
  const things: Thing[] = [];
  const seenThingIds = new Set<string>();
  const groups: Group[] = [];

  for (const [index, groupDef] of def.groups.entries()) {
    const thingIds: string[] = [];

    for (const thingDef of groupDef.things) {
      const id = uuidv5(thingIdName(def.slug, thingDef.slug), BUNDLE_NAMESPACE);
      thingIds.push(id);
      // A thing appearing in two of a bundle's groups is fine and should be
      // emitted once, with the same id in both.
      if (seenThingIds.has(id)) continue;
      seenThingIds.add(id);
      things.push({
        id,
        emoji: thingDef.emoji,
        title: thingDef.title,
        ...(thingDef.description ? { description: thingDef.description } : {}),
        archived: false,
        bundleId: def.slug,
        createdAt: BUNDLE_EPOCH,
        updatedAt: BUNDLE_EPOCH,
      });
    }

    groups.push({
      id: uuidv5(groupIdName(def.slug, groupDef.slug), BUNDLE_NAMESPACE),
      title: groupDef.title,
      ...(groupDef.description ? { description: groupDef.description } : {}),
      ...(groupDef.emoji ? { emoji: groupDef.emoji } : {}),
      sortOrder: index,
      thingIds,
      bundleId: def.slug,
      createdAt: BUNDLE_EPOCH,
      updatedAt: BUNDLE_EPOCH,
    });
  }

  return {
    slug: def.slug,
    file: `${def.slug}.json`,
    envelope: {
      format: PACK_FORMAT,
      version: 1,
      exportedAt: BUNDLE_EPOCH,
      bundle: {
        id: def.slug,
        title: def.title,
        description: def.description,
        emoji: def.emoji,
        version: def.version,
      },
      groups,
      things,
    },
  };
}

export type BundleIndexEntry = {
  id: string;
  title: string;
  description: string;
  emoji: string;
  version: number;
  file: string;
  thingCount: number;
  groupCount: number;
};

/** Lets the browser list bundles without fetching each pack. */
export function buildIndex(built: readonly BuiltBundle[]): BundleIndexEntry[] {
  return built.map(({ envelope, file }) => ({
    id: envelope.bundle!.id,
    title: envelope.bundle!.title,
    description: envelope.bundle!.description ?? "",
    emoji: envelope.bundle!.emoji ?? "📦",
    version: envelope.bundle!.version,
    file,
    thingCount: envelope.things.length,
    groupCount: envelope.groups.length,
  }));
}
