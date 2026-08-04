/**
 * Format markers and the envelope version.
 *
 * Deliberately dependency-free so the bundle build script can import it from
 * plain Node without the `@/` alias or the whole schema graph coming along.
 */

/** The marker the app looks for when a file is opened. */
export const PACK_FORMAT = "thing-tracker/group-pack" as const;
export const BACKUP_FORMAT = "thing-tracker/backup" as const;

/** Bumped only for breaking envelope changes, not for schema versions. */
export const ENVELOPE_VERSION = 1;
