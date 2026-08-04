import { createContext, use, useMemo, type ReactNode } from "react";

import { createAppCollections, type AppCollectionsCtx } from "./collections";
import { dbPromise, type AppDatabase } from "./database";

type DbContextValue = {
  db: AppDatabase;
  collections: AppCollectionsCtx;
};

const DbContext = createContext<DbContextValue | null>(null);

export function DbProvider({ children }: { children: ReactNode }) {
  // Suspends until the database is open; a rejection propagates to the nearest
  // error boundary, which is the whole reason this is a promise rather than a
  // top-level await.
  const db = use(dbPromise);
  const value = useMemo<DbContextValue>(
    () => ({ db, collections: createAppCollections(db) }),
    [db],
  );

  return <DbContext value={value}>{children}</DbContext>;
}

export function useDb(): DbContextValue {
  const value = use(DbContext);
  if (!value) throw new Error("useDb must be used inside <DbProvider>");
  return value;
}

export function useCollections(): AppCollectionsCtx {
  return useDb().collections;
}
