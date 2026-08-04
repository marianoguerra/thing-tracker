import { count, createCollection, createLiveQueryCollection, max } from "@tanstack/db";
import { rxdbCollectionOptions } from "@tanstack/rxdb-db-collection";

import type { AppDatabase } from "./database";
import { EventSchema, GroupSchema, ThingSchema } from "./schema";

/**
 * Wraps the RxDB collections as TanStack DB collections.
 *
 * `getKey` is deliberately absent — the adapter derives it from RxDB's
 * `primaryKey` and its config type omits it. The adapter also strips RxDB's
 * `_rev` / `_meta` / `_deleted` / `_attachments` in both directions, so the
 * plain Zod schemas can be handed over as-is.
 */
export function createAppCollections(db: AppDatabase) {
  const things = createCollection(
    rxdbCollectionOptions({
      id: "things",
      rxCollection: db.things,
      schema: ThingSchema,
      startSync: true,
      syncBatchSize: 500,
    }),
  );

  const groups = createCollection(
    rxdbCollectionOptions({
      id: "groups",
      rxCollection: db.groups,
      schema: GroupSchema,
      startSync: true,
      syncBatchSize: 500,
    }),
  );

  const events = createCollection(
    rxdbCollectionOptions({
      id: "events",
      rxCollection: db.events,
      schema: EventSchema,
      startSync: true,
      syncBatchSize: 1000,
    }),
  );

  /**
   * Per-thing usage, maintained incrementally by TanStack DB.
   *
   * This one query answers both questions the Track screen asks of every
   * button: how often has this been logged (the frequency ordering) and when
   * was it last logged. The alternatives are worse in specific ways — a query
   * per thing is O(things) subscriptions, and a denormalised counter on the
   * thing drifts the moment an event is deleted or backdated.
   */
  const usageByThing = createLiveQueryCollection({
    id: "usageByThing",
    query: (q) =>
      q
        .from({ event: events })
        .groupBy(({ event }) => event.thingId)
        .select(({ event }) => ({
          thingId: event.thingId,
          total: count(event.id),
          lastAt: max(event.actualAt),
        })),
  });

  return { things, groups, events, usageByThing };
}

export type AppCollectionsCtx = ReturnType<typeof createAppCollections>;
