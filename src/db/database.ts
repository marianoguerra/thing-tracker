import {
  addRxPlugin,
  createRxDatabase,
  type RxCollection,
  type RxDatabase,
  type RxDatabaseCreator,
} from "rxdb/plugins/core";
import { RxDBAttachmentsPlugin } from "rxdb/plugins/attachments";
import { RxDBMigrationSchemaPlugin } from "rxdb/plugins/migration-schema";
import { getRxStorageDexie } from "rxdb/plugins/storage-dexie";

import {
  eventRxSchema,
  groupRxSchema,
  thingRxSchema,
  type Group,
  type Thing,
  type TrackedEvent,
} from "./schema";

export type AppCollections = {
  things: RxCollection<Thing>;
  groups: RxCollection<Group>;
  events: RxCollection<TrackedEvent>;
};

export type AppDatabase = RxDatabase<AppCollections>;

export const DATABASE_NAME = "thingtracker";

async function createDatabase(): Promise<AppDatabase> {
  // Dexie is the only free IndexedDB storage; the faster `storage-indexeddb`
  // and `storage-opfs` are paid. Its one real cost is that attachments are
  // stored base64 (~33% larger), which matters only once media capture ships.
  // Widened to the creator's storage type so the dev-only validator wrapper,
  // which returns a generic RxStorage, can be assigned over it.
  let storage: RxDatabaseCreator["storage"] = getRxStorageDexie();

  if (import.meta.env.DEV) {
    // Must be registered before any other plugin — it wraps their validation.
    // Dynamically imported and DEV-gated because it is large and has no value
    // in a production bundle.
    const { RxDBDevModePlugin, disableWarnings } = await import("rxdb/plugins/dev-mode");
    disableWarnings();
    addRxPlugin(RxDBDevModePlugin);

    // Dev-mode refuses to run without a schema validator wrapping the storage
    // (error DVM1) — Dexie does no validation of its own. ajv is heavy, so it
    // is dynamically imported here and never reaches the production bundle,
    // where writes are already constrained by the Zod schemas upstream.
    const { wrappedValidateAjvStorage } = await import("rxdb/plugins/validate-ajv");
    storage = wrappedValidateAjvStorage({ storage });
  }

  addRxPlugin(RxDBAttachmentsPlugin);
  addRxPlugin(RxDBMigrationSchemaPlugin);

  const db = await createRxDatabase<AppCollections>({
    name: DATABASE_NAME,
    storage,
    // Two tabs open on the same device should see each other's writes live.
    multiInstance: true,
    eventReduce: true,
    // Vite keeps the module across HMR while RxDB considers the name taken.
    ignoreDuplicate: import.meta.env.DEV,
  });

  await db.addCollections({
    // Empty migrationStrategies + the migration plugin registered up front, so
    // bumping a schema version later is one line rather than a plugin retrofit.
    things: { schema: thingRxSchema, migrationStrategies: {} },
    groups: { schema: groupRxSchema, migrationStrategies: {} },
    events: { schema: eventRxSchema, migrationStrategies: {} },
  });

  return db;
}

/**
 * Opening the database is async, and `createCollection` needs a live RxDB
 * collection, so something has to await. This is a module-level promise rather
 * than a top-level `await` for two reasons: a rejected top-level await poisons
 * the whole module graph and leaves a blank screen with nowhere to render the
 * error (Safari private mode, denied quota, a corrupt store), and it would drag
 * a real IndexedDB open into every test that transitively imports this file.
 *
 * React consumes it with `use()` under Suspense + an error boundary instead.
 */
const globalRef = globalThis as typeof globalThis & { __ttDbPromise?: Promise<AppDatabase> };

export const dbPromise: Promise<AppDatabase> = (globalRef.__ttDbPromise ??= createDatabase());
