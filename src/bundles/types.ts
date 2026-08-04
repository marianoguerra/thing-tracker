export type ThingDef = {
  /** Stable identity. Never change one; add a new slug instead. */
  slug: string;
  emoji: string;
  title: string;
  description?: string;
  /**
   * Measurement slugs this thing records, with an optional preferred unit.
   * A run is naturally distance and duration; a coffee is neither.
   */
  measures?: { slug: string; unit?: string }[];
};

export type GroupDef = {
  slug: string;
  title: string;
  emoji?: string;
  description?: string;
  /** Thing slugs, resolved to uuids at build time. */
  things: ThingDef[];
};

export type BundleDef = {
  slug: string;
  title: string;
  emoji: string;
  description: string;
  /** Bumped when things are added. Ids of existing entries never change. */
  version: number;
  groups: GroupDef[];
};
