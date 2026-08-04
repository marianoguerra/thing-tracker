# Predefined bundles

Bundles are ordinary share packs (`thing-tracker/group-pack`) that happen to ship
with the app. They load through exactly the same pipeline as a file a user was
sent: parse → plan → preview → apply. There is no second code path, and a bundle
someone tweaks and re-exports is a valid pack.

## The id stability contract

Bundle ids are **UUIDv5**, derived from a fixed namespace and a slug path:

```
NS = d9f7e5b4-1c3a-5e8d-9b2f-6a4c8e0d1f37
thing id = uuidv5("thing:<bundle>/<thing>", NS)
group id = uuidv5("group:<bundle>/<group>", NS)
```

Two users who both load Hydration end up recording against the _same_ thing id
for Water. That is what makes their data comparable, and what lets a shared pack
merge rather than duplicate.

So:

- **An id is permanent.** Once a slug ships, it keeps its id forever.
- **Presentation may change.** Emoji, title and description can be improved at
  any time; they are labels, and every user's local copy wins over an import
  anyway.
- **Meaning may not change.** If "Exercise" should become "Cardio" as a
  _different_ concept, that is a new slug and therefore a new id. Silently
  repurposing a slug corrupts every dataset that already used it.
- **Bundles are append-only.** Add things to a bundle freely; removing one
  strands data that already references it.

`ids.test.ts` enforces this: it regenerates every bundle from its definition and
asserts byte-equality with the committed JSON, and it snapshots the full set of
shipped ids so a rename or deletion fails rather than shipping quietly.

## Adding a bundle

1. Add a `*.def.ts` exporting a `BundleDef`.
2. Register it in `definitions.ts`.
3. Run `vp run bundles` to regenerate `public/bundles/`.
4. Commit the generated JSON — it is a precached asset, so onboarding works
   offline on a first launch.
