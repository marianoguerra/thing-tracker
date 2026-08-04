/**
 * Deterministic identifiers for the predefined bundles.
 *
 * Every user who loads "Hydration" gets the *same* uuid for Water. That is the
 * whole point: it makes one person's data comparable with another's, and lets a
 * shared pack merge instead of duplicating. Ids are therefore derived, not
 * random, so anyone can reproduce and verify them.
 *
 * UUIDv5 over a fixed namespace and a stable slug path.
 */

/** Namespace for all thing-tracker bundle identifiers. Never change this. */
export const BUNDLE_NAMESPACE = "d9f7e5b4-1c3a-5e8d-9b2f-6a4c8e0d1f37";

export const thingIdName = (bundleSlug: string, thingSlug: string) =>
  `thing:${bundleSlug}/${thingSlug}`;

export const groupIdName = (bundleSlug: string, groupSlug: string) =>
  `group:${bundleSlug}/${groupSlug}`;
