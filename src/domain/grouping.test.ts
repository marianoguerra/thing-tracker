import { describe, expect, it } from "vite-plus/test";

import { newGroup, newThing, type Thing } from "@/db/schema";
import { UNGROUPED_ID, buildTagRows, groupsByThing } from "./grouping";
import { applyFrozenOrder, indexUsage, rankThings } from "./ranking";
import { filterThings, scoreThing } from "./search";
import { terms } from "@/lib/text";

const water = newThing({ id: "water", emoji: "💧", title: "Water" });
const coffee = newThing({ id: "coffee", emoji: "☕", title: "Coffee" });
const run = newThing({ id: "run", emoji: "🏃", title: "Run" });

describe("buildTagRows", () => {
  it("puts a thing tagged twice in both rows — that is the feature", () => {
    const rows = buildTagRows(
      [
        newGroup({ id: "g1", title: "Drinks", thingIds: ["water"], sortOrder: 0 }),
        newGroup({ id: "g2", title: "Health", thingIds: ["water"], sortOrder: 1 }),
      ],
      [water],
    );
    expect(rows.map((r) => r.title)).toEqual(["Drinks", "Health"]);
    expect(rows.every((r) => r.things[0]?.id === "water")).toBe(true);
  });

  it("collects untagged things into Ungrouped, exactly once", () => {
    const rows = buildTagRows(
      [newGroup({ id: "g1", title: "Drinks", thingIds: ["water"], sortOrder: 0 })],
      [water, coffee, run],
    );
    const ungrouped = rows.find((r) => r.id === UNGROUPED_ID);
    expect(ungrouped?.things.map((t) => t.id)).toEqual(["coffee", "run"]);
    expect(rows.filter((r) => r.id === UNGROUPED_ID)).toHaveLength(1);
  });

  it("omits Ungrouped when every thing is tagged", () => {
    const rows = buildTagRows(
      [newGroup({ id: "g1", title: "All", thingIds: ["water"], sortOrder: 0 })],
      [water],
    );
    expect(rows.some((r) => r.id === UNGROUPED_ID)).toBe(false);
  });

  it("drops rows left empty once their things are filtered out", () => {
    // Happens constantly while searching; a header with nothing under it is
    // worse than no header.
    const rows = buildTagRows(
      [newGroup({ id: "g1", title: "Drinks", thingIds: ["water"], sortOrder: 0 })],
      [],
    );
    expect(rows).toEqual([]);
  });

  it("ignores ids a group lists but that no longer exist", () => {
    const rows = buildTagRows(
      [newGroup({ id: "g1", title: "Drinks", thingIds: ["water", "ghost"], sortOrder: 0 })],
      [water],
    );
    expect(rows[0]?.things).toHaveLength(1);
  });

  it("orders rows by sortOrder", () => {
    const rows = buildTagRows(
      [
        newGroup({ id: "b", title: "Second", thingIds: ["coffee"], sortOrder: 5 }),
        newGroup({ id: "a", title: "First", thingIds: ["water"], sortOrder: 1 }),
      ],
      [water, coffee],
    );
    expect(rows.map((r) => r.title)).toEqual(["First", "Second"]);
  });
});

describe("groupsByThing", () => {
  it("inverts membership", () => {
    const index = groupsByThing([
      newGroup({ id: "g1", title: "A", thingIds: ["water", "coffee"], sortOrder: 0 }),
      newGroup({ id: "g2", title: "B", thingIds: ["water"], sortOrder: 1 }),
    ]);
    expect(index.get("water")?.map((g) => g.id)).toEqual(["g1", "g2"]);
    expect(index.get("run")).toBeUndefined();
  });
});

describe("rankThings", () => {
  it("orders most-used first", () => {
    const usage = indexUsage([
      { thingId: "coffee", total: 9, lastAt: 1 },
      { thingId: "water", total: 20, lastAt: 1 },
    ]);
    expect(rankThings([coffee, water, run], usage).map((t) => t.id)).toEqual([
      "water",
      "coffee",
      "run",
    ]);
  });

  it("breaks ties deterministically", () => {
    // A non-total comparator would let equal-count things swap on unrelated
    // re-renders, moving buttons under the user's thumb.
    const usage = indexUsage([
      { thingId: "coffee", total: 3, lastAt: 100 },
      { thingId: "water", total: 3, lastAt: 500 },
      { thingId: "run", total: 3, lastAt: 500 },
    ]);
    const once = rankThings([coffee, water, run], usage).map((t) => t.id);
    const twice = rankThings([run, coffee, water], usage).map((t) => t.id);
    expect(once).toEqual(twice);
    expect(once[0]).not.toBe("coffee");
  });

  it("does not mutate its input", () => {
    const input = [coffee, water];
    rankThings(input, indexUsage([]));
    expect(input.map((t) => t.id)).toEqual(["coffee", "water"]);
  });
});

describe("applyFrozenOrder", () => {
  it("respects a previously frozen order", () => {
    const order = ["run", "water", "coffee"];
    expect(applyFrozenOrder([coffee, water, run], order).map((t) => t.id)).toEqual(order);
  });

  it("appends things created since the last rank rather than promoting them", () => {
    const fresh: Thing = newThing({ id: "new", emoji: "🆕", title: "Aaa new" });
    const ordered = applyFrozenOrder([fresh, water, coffee], ["water", "coffee"]);
    expect(ordered.map((t) => t.id)).toEqual(["water", "coffee", "new"]);
  });
});

describe("search", () => {
  it("matches diacritics insensitively", () => {
    const cafe = newThing({ id: "c", emoji: "☕", title: "Café" });
    expect(scoreThing(cafe, terms("cafe"), "cafe")).toBeGreaterThan(0);
  });

  it("finds a thing by its emoji", () => {
    expect(scoreThing(coffee, terms("☕"), "☕")).toBeGreaterThan(0);
  });

  it("ranks a title match above a description-only one", () => {
    const noted = newThing({ id: "n", emoji: "📝", title: "Notes", description: "water related" });
    const [first] = filterThings([noted, water], "water");
    expect(first?.id).toBe("water");
  });

  it("requires every term to match", () => {
    expect(filterThings([water, coffee], "water coffee")).toEqual([]);
  });

  it("returns everything for an empty query", () => {
    expect(filterThings([water, coffee], "   ")).toHaveLength(2);
  });
});
