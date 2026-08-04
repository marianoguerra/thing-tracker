import { describe, expect, it } from "vite-plus/test";

import { assertRxIndexable, eventRxSchema, groupRxSchema, thingRxSchema } from "./index";
import { EventSchema, newEvent } from "./event";
import { GroupSchema, newGroup } from "./group";
import { ThingSchema, newThing } from "./thing";

type JsonProp = {
  type?: string;
  maxLength?: number;
  minimum?: number;
  maximum?: number;
  multipleOf?: number;
};
type JsonSchema = {
  properties: Record<string, JsonProp>;
  required: string[];
  indexes?: (string | string[])[];
  primaryKey: string;
  version: number;
};

const SCHEMAS = [
  { name: "things", rx: thingRxSchema as unknown as JsonSchema },
  { name: "groups", rx: groupRxSchema as unknown as JsonSchema },
  { name: "events", rx: eventRxSchema as unknown as JsonSchema },
];

/**
 * The anti-drift suite.
 *
 * The Zod schemas are the source of truth and the RxDB schemas are generated
 * from them, but generation alone doesn't stop someone hand-editing an index or
 * adding a field whose constraints RxDB won't accept. RxDB only complains at
 * `addCollections` time, with a stack trace pointing at the storage layer
 * rather than the offending field — these tests fail at the field instead.
 */
describe("generated RxDB schemas", () => {
  for (const { name, rx } of SCHEMAS) {
    describe(name, () => {
      it("passes the indexability invariants", () => {
        expect(() => {
          assertRxIndexable(rx as never);
        }).not.toThrow();
      });

      it("declares a string primary key with a maxLength, and requires it", () => {
        const pk = rx.properties[rx.primaryKey];
        expect(pk?.type).toBe("string");
        expect(typeof pk?.maxLength).toBe("number");
        expect(rx.required).toContain(rx.primaryKey);
      });

      it("gives every indexed field the constraints RxDB needs", () => {
        for (const index of rx.indexes ?? []) {
          for (const field of Array.isArray(index) ? index : [index]) {
            const prop = rx.properties[field];
            expect(prop, `${name}.${field} is indexed but not declared`).toBeDefined();
            expect(rx.required, `${name}.${field} is indexed so must be required`).toContain(field);

            // RxDB cannot index booleans at all, and needs finite bounds on
            // numbers plus a length on strings to build its index keys.
            expect(prop?.type).not.toBe("boolean");
            if (prop?.type === "string") expect(typeof prop.maxLength).toBe("number");
            if (prop?.type === "number") {
              expect(typeof prop.minimum).toBe("number");
              expect(typeof prop.maximum).toBe("number");
              expect(typeof prop.multipleOf).toBe("number");
            }
          }
        }
      });

      it("is not a closed schema", () => {
        // RxDB adds _rev / _meta / _deleted / _attachments to every document,
        // so additionalProperties:false would make it reject its own writes.
        expect((rx as unknown as Record<string, unknown>).additionalProperties).toBeUndefined();
      });
    });
  }
});

describe("record factories", () => {
  it("produces things that satisfy the schema", () => {
    const thing = newThing({ emoji: "☕", title: "Coffee" });
    expect(() => ThingSchema.parse(thing)).not.toThrow();
  });

  it("produces groups that satisfy the schema", () => {
    const group = newGroup({ title: "Drinks" });
    expect(() => GroupSchema.parse(group)).not.toThrow();
  });

  it("produces events that satisfy the schema", () => {
    const event = newEvent({ thingId: "abc" });
    expect(() => EventSchema.parse(event)).not.toThrow();
  });

  it("omits absent optionals rather than setting them to undefined", () => {
    // An explicit `undefined` keeps its key all the way into IndexedDB, where
    // validation then rejects it against `type: "string"`.
    const thing = newThing({ emoji: "☕", title: "Coffee" });
    expect(Object.hasOwn(thing, "description")).toBe(false);
    expect(Object.hasOwn(thing, "color")).toBe(false);
    expect(Object.hasOwn(thing, "duration")).toBe(false);

    const event = newEvent({ thingId: "abc" });
    expect(Object.hasOwn(event, "notes")).toBe(false);
    expect(Object.hasOwn(event, "durationMs")).toBe(false);
  });

  it("defaults an event's actualAt to when it was recorded", () => {
    const event = newEvent({ thingId: "abc", recordedAt: 1000 });
    expect(event.actualAt).toBe(1000);
  });
});
