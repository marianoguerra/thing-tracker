/**
 * Regenerates `public/bundles/` from the definitions in `src/bundles`.
 *
 * The output is committed: bundles are precached assets, so a first, offline
 * launch can still offer onboarding. Run with `vp run bundles`.
 */
import { mkdir, readdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { buildBundle, buildIndex } from "../src/bundles/build.ts";
import { BUNDLE_DEFS } from "../src/bundles/definitions.ts";

const OUT_DIR = join(import.meta.dirname, "..", "public", "bundles");

const built = BUNDLE_DEFS.map(buildBundle);

// Duplicate ids across bundles would make two different things indistinguishable
// in everyone's data, so fail the build rather than ship it.
const seen = new Map<string, string>();
for (const bundle of built) {
  for (const record of [...bundle.envelope.things, ...bundle.envelope.groups]) {
    const previous = seen.get(record.id);
    if (previous) {
      throw new Error(
        `Duplicate id ${record.id}: "${previous}" and "${bundle.slug}/${record.title}"`,
      );
    }
    seen.set(record.id, `${bundle.slug}/${record.title}`);
  }
}

await mkdir(OUT_DIR, { recursive: true });

// Drop stale files so a removed bundle doesn't linger in the precache.
for (const entry of await readdir(OUT_DIR).catch(() => [])) {
  await rm(join(OUT_DIR, entry));
}

for (const bundle of built) {
  await writeFile(join(OUT_DIR, bundle.file), `${JSON.stringify(bundle.envelope, null, 2)}\n`);
}

await writeFile(join(OUT_DIR, "index.json"), `${JSON.stringify(buildIndex(built), null, 2)}\n`);

const things = built.reduce((sum, b) => sum + b.envelope.things.length, 0);
const groups = built.reduce((sum, b) => sum + b.envelope.groups.length, 0);
console.log(
  `Wrote ${String(built.length)} bundles: ${String(groups)} tags, ${String(things)} things`,
);
