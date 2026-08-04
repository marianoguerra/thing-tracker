import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vite-plus/test";

import { MEASUREMENT_DEFS } from "@/measurements/definitions";
import { measurementId } from "@/measurements/ids";
import { buildBundle, buildIndex } from "./build";
import { BUNDLE_DEFS } from "./definitions";

const OUT_DIR = join(process.cwd(), "public", "bundles");

/**
 * The id stability contract (see README.md).
 *
 * These ids are what make one person's data comparable with another's. A
 * changed or dropped id doesn't fail loudly — it silently forks every dataset
 * that already used it, and there is no way back once the files are out there.
 * So the suite fails on any drift rather than trusting the generator.
 */
describe("bundle generation", () => {
  const built = BUNDLE_DEFS.map(buildBundle);

  it("matches the committed JSON byte for byte", () => {
    // Guards against a hand-edit to public/bundles, and against a generator
    // change that nobody remembered to re-run.
    for (const bundle of built) {
      const onDisk = readFileSync(join(OUT_DIR, bundle.file), "utf8");
      expect(onDisk, `${bundle.file} is stale — run \`vp run bundles\``).toBe(
        `${JSON.stringify(bundle.envelope, null, 2)}\n`,
      );
    }
  });

  it("matches the committed index", () => {
    const onDisk = readFileSync(join(OUT_DIR, "index.json"), "utf8");
    expect(onDisk).toBe(`${JSON.stringify(buildIndex(built), null, 2)}\n`);
  });

  it("leaves no orphan files behind a removed bundle", () => {
    const expected = new Set([...built.map((b) => b.file), "index.json"]);
    for (const file of readdirSync(OUT_DIR)) expect(expected.has(file)).toBe(true);
  });

  it("is deterministic — rebuilding produces identical output", () => {
    const again = BUNDLE_DEFS.map(buildBundle);
    expect(JSON.stringify(again)).toBe(JSON.stringify(built));
  });

  it("never reuses an id across bundles", () => {
    const seen = new Map<string, string>();
    for (const bundle of built) {
      for (const record of [...bundle.envelope.things, ...bundle.envelope.groups]) {
        expect(seen.has(record.id), `${record.id} duplicated`).toBe(false);
        seen.set(record.id, `${bundle.slug}/${record.title}`);
      }
    }
  });

  it("keeps slugs unique within a bundle", () => {
    for (const def of BUNDLE_DEFS) {
      const groupSlugs = def.groups.map((g) => g.slug);
      expect(new Set(groupSlugs).size, `${def.slug} group slugs`).toBe(groupSlugs.length);
      for (const group of def.groups) {
        const thingSlugs = group.things.map((t) => t.slug);
        expect(new Set(thingSlugs).size, `${def.slug}/${group.slug}`).toBe(thingSlugs.length);
      }
    }
  });

  it("gives every thing an emoji, since the emoji is the label", () => {
    for (const bundle of built) {
      for (const thing of bundle.envelope.things) {
        expect(thing.emoji.length, `${bundle.slug}/${thing.title}`).toBeGreaterThan(0);
      }
    }
  });

  it("references only measurements that exist, and ships them with the pack", () => {
    const known = new Set(MEASUREMENT_DEFS.map((def) => measurementId(def.slug)));
    for (const bundle of built) {
      const shipped = new Set(bundle.envelope.measurements.map((m) => m.id));
      for (const thing of bundle.envelope.things) {
        for (const ref of thing.measurements) {
          expect(known.has(ref.measurementId), `${bundle.slug}/${thing.title}`).toBe(true);
          // A pack whose things reference a scale it doesn't carry leaves the
          // recipient with a number and no units.
          expect(shipped.has(ref.measurementId), `${bundle.slug} ships its scales`).toBe(true);
        }
      }
    }
  });

  it("keeps group membership internally consistent", () => {
    for (const bundle of built) {
      const ids = new Set(bundle.envelope.things.map((t) => t.id));
      for (const group of bundle.envelope.groups) {
        for (const thingId of group.thingIds) {
          expect(ids.has(thingId), `${bundle.slug}/${group.title}`).toBe(true);
        }
      }
    }
  });
});

describe("shipped identifiers", () => {
  it("has not changed", () => {
    // The snapshot IS the contract. A failure here means either a deliberate,
    // documented addition — accept it — or an id that just broke every dataset
    // recorded against it, which must never be accepted.
    const ids = BUNDLE_DEFS.flatMap((def) => {
      const bundle = buildBundle(def);
      return [
        ...bundle.envelope.groups.map((g) => `group ${def.slug}/${g.title} = ${g.id}`),
        ...bundle.envelope.things.map((t) => `thing ${def.slug}/${t.title} = ${t.id}`),
      ];
    })
      .concat(MEASUREMENT_DEFS.map((def) => `measurement ${def.slug} = ${measurementId(def.slug)}`))
      .sort();

    expect(ids).toMatchSnapshot();
  });
});
