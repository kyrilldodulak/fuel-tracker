import { describe, expect, it } from "vitest";
import { mergeDays } from "./store";

type P = { a95?: number; dt?: number };

describe("mergeDays", () => {
  it("adds new days in both modes", () => {
    for (const overwrite of [true, false]) {
      const t: Record<string, P> = { "2026-10-12": { a95: 1 } };
      mergeDays(t, { "2026-10-13": { a95: 2 } }, overwrite);
      expect(t).toEqual({ "2026-10-12": { a95: 1 }, "2026-10-13": { a95: 2 } });
    }
  });

  it("overwrite=true: incoming wins, absent fields kept", () => {
    const t: Record<string, P> = { d: { a95: 1, dt: 5 } };
    mergeDays(t, { d: { a95: 2 } }, true);
    expect(t.d).toEqual({ a95: 2, dt: 5 });
  });

  it("overwrite=false: existing day untouched", () => {
    const t: Record<string, P> = { d: { a95: 1 } };
    const original = t.d;
    mergeDays(t, { d: { a95: 2, dt: 3 } }, false);
    expect(t.d).toBe(original);
    expect(t.d).toEqual({ a95: 1 });
  });

  it("does not mutate incoming values", () => {
    const incoming: Record<string, P> = { d: { a95: 2 } };
    const t: Record<string, P> = {};
    mergeDays(t, incoming, false);
    t.d.a95 = 99;
    expect(incoming.d.a95).toBe(2);
  });
});
