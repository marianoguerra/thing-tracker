/**
 * Drops keys whose value is `undefined`.
 *
 * An optional field written as an explicit `undefined` is not the same as an
 * absent one: the key survives into IndexedDB, and JSON-schema validation then
 * sees `description: undefined` against `type: "string"` and rejects the write.
 * Every record factory runs its output through this.
 */
export function compact<T extends Record<string, unknown>>(obj: T): T {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) out[key] = value;
  }
  return out as T;
}
