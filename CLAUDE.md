<!--VITE PLUS START-->

# Using Vite+, the Unified Toolchain for the Web

This project is using Vite+, a unified toolchain built on top of Vite, Rolldown, Vitest, tsdown, Oxlint, Oxfmt, and Vite Task. Vite+ wraps runtime management, package management, and frontend tooling in a single global CLI called `vp`. Vite+ is distinct from Vite, and it invokes Vite through `vp dev` and `vp build`. Run `vp help` to print a list of commands and `vp <command> --help` for information about a specific command.

Docs are local at `node_modules/vite-plus/docs` or online at https://viteplus.dev/guide/.

## Review Checklist

- [ ] Run `vp install` after pulling remote changes and before getting started.
- [ ] Run `vp check` and `vp test` to format, lint, type check and test changes.
- [ ] Check if there are `vite.config.ts` tasks or `package.json` scripts necessary for validation, run via `vp run <script>`.
- [ ] If setup, runtime, or package-manager behavior looks wrong, run `vp env doctor` and include its output when asking for help.

<!--VITE PLUS END-->

# Thing Tracker

A local-first, installable PWA for tracking things you do. Tap an emoji, it's
logged. No server, no account — the browser holds the only copy.

## Architecture

- **Data**: RxDB over Dexie/IndexedDB, wrapped by `@tanstack/rxdb-db-collection`
  and queried with `@tanstack/react-db` live queries. Four collections:
  `things`, `groups` (tags), `events`, `measurements`.
- **Schemas**: Zod is the single source of truth. `src/db/schema/to-rx-schema.ts`
  derives the RxDB schema from it and asserts the index rules RxDB only
  complains about at `addCollections` time.
- **Groups are tags** — local, per-user, and the export unit. Membership lives
  on the group as `thingIds`, so a share pack is one self-contained document.
- **`src/domain/**`and`src/lib/**` are DB-free on purpose**, which is what
  makes them testable without a browser. Keep them that way.

## Gotchas worth knowing

- **`defineConfig` comes from `"vite-plus"`, not `"vite"`.** The repo lints the
  latter as an error in config files.
- **Test files import from `"vite-plus/test"`, never `"vitest"`.** The lint rule
  fires on `vitest` specifiers anywhere under `src/`.
- **Never add `baseUrl` to tsconfig.** tsgolint doesn't support it and Vite+
  silently disables type-aware lint when it is present. `paths` alone works.
- **Do not run `shadcn init`** — it writes `baseUrl` and patches
  `vite.config.ts`. `components.json` is hand-maintained.
- **Don't put `webmanifest` in workbox `globPatterns`.** vite-plugin-pwa injects
  the manifest itself; a glob that also matches it makes workbox throw out of
  `precacheAndRoute`, and the service worker then installs and activates while
  caching nothing.
- **`collection.toArray` returns records carrying TanStack DB bookkeeping**
  (`$key`, `$synced`, `$origin`, `$collectionId`). Anything written to a file
  must be parsed through its Zod schema first.
- **Optional fields must be absent, not `undefined`.** An explicit `undefined`
  keeps its key into IndexedDB, where validation rejects it. Record factories
  run through `compact()`.
- **RxDB dev-mode needs a validator wrapping the storage** (error DVM1); ajv is
  dev-gated and dynamically imported.
- Changing a schema means bumping its `version` and adding a migration
  strategy — RxDB refuses otherwise (error DB6).

## Fixed identifiers

Bundle and measurement ids are UUIDv5 over a fixed namespace so that separate
people's data is comparable and shared packs merge instead of duplicating.
**An id is permanent.** See `src/bundles/README.md`; `src/bundles/ids.test.ts`
snapshot-locks every shipped id.

Regenerate the shipped bundles with `vp run bundles` and commit the output —
`public/bundles/` is precached so onboarding works on a first, offline launch.
