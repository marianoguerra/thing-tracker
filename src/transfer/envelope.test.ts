import { describe, expect, it } from "vite-plus/test";

import { newEvent, newGroup, newThing } from "@/db/schema";
import { BACKUP_FORMAT, ENVELOPE_VERSION, PACK_FORMAT, parseEnvelope } from "./envelope";

const pack = {
  format: PACK_FORMAT,
  version: ENVELOPE_VERSION,
  exportedAt: 1_700_000_000_000,
  groups: [newGroup({ id: "g", title: "Drinks", thingIds: ["t"], sortOrder: 0 })],
  things: [newThing({ id: "t", emoji: "💧", title: "Water" })],
  measurements: [],
};

const backup = {
  format: BACKUP_FORMAT,
  version: ENVELOPE_VERSION,
  exportedAt: 1_700_000_000_000,
  schemaVersions: { things: 2, groups: 0, events: 2, measurements: 0 },
  counts: { things: 1, groups: 0, events: 1, attachments: 0 },
  things: [newThing({ id: "t", emoji: "💧", title: "Water" })],
  groups: [],
  events: [newEvent({ id: "e", thingId: "t", recordedAt: 5 })],
  measurements: [],
  range: { from: 5, to: 5 },
  attachments: [],
};

describe("parseEnvelope", () => {
  it("round-trips a pack", () => {
    const result = parseEnvelope(JSON.stringify(pack));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.envelope).toEqual(pack);
  });

  it("round-trips a backup", () => {
    const result = parseEnvelope(JSON.stringify(backup));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.envelope).toEqual(backup);
  });

  it("distinguishes the failure modes, because they need different words", () => {
    expect(parseEnvelope("not json")).toMatchObject({ ok: false, kind: "not-json" });
    expect(parseEnvelope("{}")).toMatchObject({ ok: false, kind: "unknown-format" });
    expect(parseEnvelope('"a string"')).toMatchObject({ ok: false, kind: "unknown-format" });
    expect(parseEnvelope(JSON.stringify({ format: "other/thing" }))).toMatchObject({
      ok: false,
      kind: "unknown-format",
    });
  });

  it("reports a future format as too new rather than as corruption", () => {
    const future = parseEnvelope(JSON.stringify({ ...pack, version: ENVELOPE_VERSION + 1 }));
    expect(future).toMatchObject({ ok: false, kind: "too-new" });
    if (!future.ok) expect(future.reason).toContain("newer version");
  });

  it("names the offending field when a file is damaged", () => {
    const damaged = JSON.stringify({
      ...pack,
      things: [{ ...pack.things[0], emoji: 42 }],
    });
    const result = parseEnvelope(damaged);
    expect(result).toMatchObject({ ok: false, kind: "invalid" });
    if (!result.ok) expect(result.reason).toContain("things.0.emoji");
  });

  it("defaults measurements so files written before they existed still load", () => {
    const { measurements: _dropped, ...older } = pack;
    const result = parseEnvelope(JSON.stringify(older));
    expect(result.ok).toBe(true);
    if (result.ok && result.envelope.format === PACK_FORMAT) {
      expect(result.envelope.measurements).toEqual([]);
    }
  });

  it("strips anything not in the schema", () => {
    // Keeps a hand-edited or foreign field from riding into the store.
    const result = parseEnvelope(JSON.stringify({ ...pack, sneaky: "value" }));
    expect(result.ok).toBe(true);
    if (result.ok) expect("sneaky" in result.envelope).toBe(false);
  });
});
