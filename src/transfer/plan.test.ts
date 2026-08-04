import { describe, expect, it } from "vite-plus/test";

import { newEvent, newGroup, newThing, type Group, type Thing } from "@/db/schema";
import { PACK_FORMAT, type PackEnvelope } from "./envelope";
import { isNoopPlan, planBackupImport, planPackImport, type LocalSnapshot } from "./plan";

const EMPTY: LocalSnapshot = { things: [], groups: [], events: [], measurements: [] };

function thing(id: string, title: string, extra: Partial<Thing> = {}): Thing {
  return newThing({ id, emoji: "⭐", title, ...extra });
}

function group(id: string, title: string, thingIds: string[], extra: Partial<Group> = {}): Group {
  return newGroup({ id, title, thingIds, sortOrder: 0, ...extra });
}

function pack(groups: Group[], things: Thing[]): PackEnvelope {
  return {
    format: PACK_FORMAT,
    version: 1,
    exportedAt: 0,
    groups,
    things,
    measurements: [],
  };
}

describe("planPackImport", () => {
  const water = thing("t-water", "Water");
  const coffee = thing("t-coffee", "Coffee");
  const drinks = group("g-drinks", "Drinks", [water.id, coffee.id]);
  const sample = pack([drinks], [water, coffee]);

  it("creates everything on a fresh device", () => {
    const plan = planPackImport(sample, EMPTY);
    expect(plan.things.create).toHaveLength(2);
    expect(plan.groups.create).toHaveLength(1);
    expect(plan.groups.create[0]?.thingIds).toEqual([water.id, coffee.id]);
  });

  it("is a no-op when the same pack is imported twice", () => {
    // The property that makes re-adding a bundle safe. Everything hinges on
    // membership merging as a union rather than a replace.
    const afterFirst: LocalSnapshot = {
      ...EMPTY,
      things: [water, coffee],
      groups: [{ ...drinks }],
    };
    const second = planPackImport(sample, afterFirst);
    expect(isNoopPlan(second)).toBe(true);
    expect(second.things.unchanged).toHaveLength(2);
  });

  it("never rewrites a thing id", () => {
    const local: LocalSnapshot = { ...EMPTY, things: [{ ...water, title: "Agua" }] };
    const plan = planPackImport(sample, local);
    const ids = [...plan.things.create, ...plan.things.update, ...plan.things.unchanged].map(
      (t) => t.id,
    );
    expect(ids).toContain(water.id);
  });

  it("keeps local labels by default", () => {
    const local: LocalSnapshot = { ...EMPTY, things: [{ ...water, title: "Agua", emoji: "🚰" }] };
    const plan = planPackImport(sample, local);
    expect(plan.things.unchanged[0]?.title).toBe("Agua");
    expect(plan.things.update).toHaveLength(0);
  });

  it("overwrites details only when explicitly asked, preserving createdAt", () => {
    const localWater = { ...water, title: "Agua", createdAt: 111 };
    const local: LocalSnapshot = { ...EMPTY, things: [localWater] };
    const plan = planPackImport(sample, local, { overwriteThingDetails: true });
    expect(plan.things.update[0]?.title).toBe("Water");
    expect(plan.things.update[0]?.createdAt).toBe(111);
  });

  it("merges membership as a union and leaves the local group's own labels alone", () => {
    const localGroup = group("g-drinks", "My drinks", [coffee.id], { emoji: "🥤" });
    const local: LocalSnapshot = { ...EMPTY, things: [water, coffee], groups: [localGroup] };
    const plan = planPackImport(sample, local);

    expect(plan.groups.create).toHaveLength(0);
    expect(plan.groups.mergeInto).toEqual([
      { id: "g-drinks", title: "My drinks", addedThingIds: [water.id] },
    ]);
  });

  it("warns and skips members the file doesn't actually include", () => {
    const dangling = pack([group("g-x", "Partial", ["t-water", "t-missing"])], [water]);
    const plan = planPackImport(dangling, EMPTY);
    expect(plan.warnings).toHaveLength(1);
    expect(plan.groups.create[0]?.thingIds).toEqual([water.id]);
  });

  it("assigns new groups a sort order after the existing ones", () => {
    const local: LocalSnapshot = { ...EMPTY, groups: [group("g-a", "A", [], { sortOrder: 4 })] };
    const plan = planPackImport(sample, local);
    expect(plan.groups.create[0]?.sortOrder).toBe(5);
  });
});

describe("planBackupImport", () => {
  const water = thing("t-water", "Water", { updatedAt: 1000 });
  const backup = {
    format: "thing-tracker/backup" as const,
    version: 1,
    exportedAt: 0,
    schemaVersions: { things: 2, groups: 0, events: 2 },
    counts: { things: 1, groups: 0, events: 2, attachments: 0 },
    things: [water],
    groups: [],
    events: [
      newEvent({ id: "e1", thingId: water.id, recordedAt: 10 }),
      newEvent({ id: "e2", thingId: water.id, recordedAt: 20 }),
    ],
    measurements: [],
    attachments: [],
  };

  it("skips events it already has rather than duplicating history", () => {
    const local: LocalSnapshot = {
      ...EMPTY,
      things: [water],
      events: [newEvent({ id: "e1", thingId: water.id, recordedAt: 10 })],
    };
    const plan = planBackupImport(backup, local, "merge");
    expect(plan.events.skipped).toBe(1);
    expect(plan.events.create.map((e) => e.id)).toEqual(["e2"]);
  });

  it("restoring the same backup twice changes nothing", () => {
    const local: LocalSnapshot = { ...EMPTY, things: [water], events: backup.events };
    expect(isNoopPlan(planBackupImport(backup, local, "merge"))).toBe(true);
  });

  it("keeps the local copy when it is newer, and takes the remote when it isn't", () => {
    const newerLocal: LocalSnapshot = {
      ...EMPTY,
      things: [{ ...water, title: "Newer", updatedAt: 2000 }],
    };
    expect(planBackupImport(backup, newerLocal, "merge").things.unchanged[0]?.title).toBe("Newer");

    const olderLocal: LocalSnapshot = {
      ...EMPTY,
      things: [{ ...water, title: "Older", updatedAt: 5 }],
    };
    expect(planBackupImport(backup, olderLocal, "merge").things.update[0]?.title).toBe("Water");
  });

  it("unions group membership even when the incoming group is newer", () => {
    // Picking a side would silently drop tags the other had, and a lost tag is
    // unrecoverable in a way an extra one never is.
    const incoming = group("g", "Remote", ["a"], { updatedAt: 9000 });
    const localGroup = group("g", "Local", ["b"], { updatedAt: 1 });
    const plan = planBackupImport(
      { ...backup, groups: [incoming] },
      { ...EMPTY, groups: [localGroup] },
      "merge",
    );
    expect(plan.groups.replace[0]?.thingIds.sort()).toEqual(["a", "b"]);
  });

  it("warns about what replace mode destroys", () => {
    const local: LocalSnapshot = { ...EMPTY, things: [water], events: [backup.events[0]!] };
    const plan = planBackupImport(backup, local, "replace");
    expect(plan.warnings[0]).toContain("Replaces everything");
    expect(isNoopPlan(plan)).toBe(false);
  });
});
