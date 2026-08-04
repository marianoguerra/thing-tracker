import { z } from "zod";

/**
 * 2100-01-01T00:00:00Z. RxDB refuses to index a number without finite bounds,
 * so every timestamp needs an explicit ceiling — this one is far enough out to
 * be irrelevant and small enough to keep the index keys short.
 */
export const MAX_TS = 4_102_444_800_000;

export const Uuid = z.string().max(36);

/**
 * Epoch milliseconds. `.multipleOf(1)` rather than `.int()` on purpose: `.int()`
 * makes Zod emit `type: "integer"`, which RxDB does not accept, while
 * `multipleOf` keeps `type: "number"` and still satisfies the index rules.
 */
export const Timestamp = z.number().min(0).max(MAX_TS).multipleOf(1);

/**
 * One emoji. 16 is generous on purpose: ZWJ sequences and skin-tone modifiers
 * are long (👨‍👩‍👧‍👦 is 11 UTF-16 code units) and clipping one produces mojibake.
 */
export const Emoji = z.string().min(1).max(16);

/** "#rgb" | "#rrggbb" | "#rrggbbaa" */
export const HexColor = z.string().max(9);

export const ShortText = z.string().max(120);
export const LongText = z.string().max(2000);

/** A bundle identifier, e.g. "habits" — provenance for bundle-loaded records. */
export const BundleId = z.string().max(64);
