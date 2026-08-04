import type { RxJsonSchema } from "rxdb/plugins/core";
import { z } from "zod";

export type RxIndex = string | string[];

type ToRxSchemaOptions = {
  version: number;
  primaryKey: string;
  indexes?: RxIndex[];
  /** Pass `{}` to enable the attachments plugin for this collection. */
  attachments?: Record<string, never>;
};

type JsonSchemaObject = {
  type?: string;
  properties?: Record<string, JsonSchemaProperty>;
  required?: string[];
  [key: string]: unknown;
};

type JsonSchemaProperty = {
  type?: string;
  maxLength?: number;
  minimum?: number;
  maximum?: number;
  multipleOf?: number;
};

/**
 * Derives an RxDB collection schema from a Zod schema.
 *
 * Zod is the single source of truth: `.max()` / `.min()` / `.multipleOf()` emit
 * the very `maxLength` / `minimum` / `maximum` / `multipleOf` keywords RxDB
 * requires on indexed fields, so the two representations cannot drift as long
 * as this is the only way schemas are built. `assertRxIndexable` below turns
 * "cannot drift" into something enforced rather than hoped for.
 */
export function toRxSchema<T extends z.ZodObject>(
  zodSchema: T,
  opts: ToRxSchemaOptions,
): RxJsonSchema<z.infer<T>> {
  const json = z.toJSONSchema(zodSchema, {
    target: "draft-7",
    io: "output",
  }) as JsonSchemaObject;

  delete json.$schema;
  // RxDB adds _rev / _meta / _deleted / _attachments to every document, so a
  // closed schema would reject its own writes.
  delete json.additionalProperties;

  const schema = {
    ...json,
    version: opts.version,
    primaryKey: opts.primaryKey,
    keyCompression: false,
    ...(opts.indexes ? { indexes: opts.indexes } : {}),
    ...(opts.attachments ? { attachments: opts.attachments } : {}),
  } as RxJsonSchema<z.infer<T>>;

  assertRxIndexable(schema as unknown as JsonSchemaObject & ToRxSchemaOptions);
  return schema;
}

/**
 * Fails loudly on the schema mistakes RxDB only reports at `addCollections`
 * time, in a stack trace that points at the storage layer rather than at the
 * field that is actually wrong.
 */
export function assertRxIndexable(schema: JsonSchemaObject & ToRxSchemaOptions): void {
  const props = schema.properties ?? {};
  const required = new Set(schema.required ?? []);
  const where = (field: string) => `${String(schema.primaryKey)} collection: field "${field}"`;

  const pk = props[schema.primaryKey];
  if (!pk) throw new Error(`primaryKey "${schema.primaryKey}" is not declared in properties`);
  if (pk.type !== "string") throw new Error(`primaryKey "${schema.primaryKey}" must be a string`);
  if (typeof pk.maxLength !== "number")
    throw new Error(`primaryKey "${schema.primaryKey}" needs a maxLength`);
  if (!required.has(schema.primaryKey))
    throw new Error(`primaryKey "${schema.primaryKey}" must be required`);

  for (const index of schema.indexes ?? []) {
    for (const field of Array.isArray(index) ? index : [index]) {
      const prop = props[field];
      if (!prop) throw new Error(`${where(field)} is indexed but not declared`);
      if (!required.has(field))
        throw new Error(`${where(field)} is indexed so it must be required`);

      switch (prop.type) {
        case "string":
          if (typeof prop.maxLength !== "number")
            throw new Error(`${where(field)} is an indexed string and needs a maxLength`);
          break;
        case "number":
          if (typeof prop.minimum !== "number" || typeof prop.maximum !== "number")
            throw new Error(`${where(field)} is an indexed number and needs minimum + maximum`);
          if (typeof prop.multipleOf !== "number")
            throw new Error(`${where(field)} is an indexed number and needs multipleOf`);
          break;
        case "boolean":
          throw new Error(`${where(field)} is a boolean; RxDB cannot index booleans`);
        default:
          throw new Error(`${where(field)} has type "${prop.type}" which cannot be indexed`);
      }
    }
  }
}
