import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  fuelFromLabel,
  parseAverages,
  parseMonthArchive,
  parseNetworks,
  parseSvgHistory,
  parseSvgKey,
} from "./sources/minfin";

const fx = (f: string) => fs.readFileSync(path.join(import.meta.dirname, "__fixtures__", f), "utf8");

describe("fuelFromLabel", () => {
  it.each([
    ["А 95+", "a95p"],
    ["А 95", "a95"],
    ["А 92", "a92"],
    ["ДТ", "dt"],
    ["ДТ+", "dtp"],
    ["Газ", "lpg"],
    ["Бензин А-95 премиум", "a95p"],
    ["Бензин А-95", "a95"],
    ["Бензин А-92", "a92"],
    ["Дизельное топливо", "dt"],
    ["Дизельное топливо премиум", "dtp"],
    ["Газ автомобильный", "lpg"],
    ["Газ авто­мобильный", "lpg"], // soft hyphen
    ["  А 95+ ", "a95p"], // nbsp + padding
    ["а 95", "a95"],
    ["A 95", "a95"], // latin A
  ])("%j -> %s", (label, fuel) => {
    expect(fuelFromLabel(label)).toBe(fuel);
  });

  it.each(["", "Дата", "АdBlue", "А 98", "Мазут"])("%j -> undefined", (label) => {
    expect(fuelFromLabel(label)).toBeUndefined();
  });
});

describe("parseAverages", () => {
  it("parses the UA page", () => {
    const { date, prices } = parseAverages(fx("minfin-avg.html"));
    expect(date).toBe("2026-10-13");
    expect(prices).toEqual({ a95p: 93.5, a95: 89.48, a92: 86.06, dt: 98.74, lpg: 46.7 });
    for (const v of Object.values(prices)) {
      expect(v).toBeGreaterThan(40);
      expect(v).toBeLessThan(150);
    }
  });

  it("parses the Kyiv region page", () => {
    const { date, prices } = parseAverages(fx("minfin-kyiv.html"));
    expect(date).toBe("2026-10-13");
    expect(prices).toEqual({ a95p: 93.69, a95: 89.22, a92: 82.97, dt: 99.13, lpg: 46.37 });
  });

  it("throws when the table is missing", () => {
    expect(() => parseAverages("<html></html>")).toThrow(/averages/);
  });
});

describe("parseNetworks", () => {
  it("parses ~36 networks from the tm page", () => {
    const { date, networks } = parseNetworks(fx("minfin-tm.html"));
    expect(date).toBe("2026-10-13");
    expect(Object.keys(networks)).toHaveLength(36);
    expect(networks.wog).toEqual({ a95p: 95.9, a95: 92.9, dt: 99.9, lpg: 48.9 });
    expect(networks.okko.a95).toBe(92.9);
    for (const prices of Object.values(networks))
      for (const v of Object.values(prices)) {
        expect(v).toBeGreaterThan(40);
        expect(v).toBeLessThan(150);
      }
  });

  it("parses the operator table of the Kyiv page", () => {
    const { date, networks } = parseNetworks(fx("minfin-kyiv.html"));
    expect(date).toBe("2026-10-13");
    expect(Object.keys(networks)).toHaveLength(17);
    for (const slug of ["okko", "wog", "socar", "upg"]) expect(networks).toHaveProperty(slug);
    expect(networks.wog).toEqual({ a95p: 95.9, a95: 92.9, dt: 99.9, lpg: 48.9 });
  });

  it("throws when no operator table exists", () => {
    expect(() => parseNetworks("<html></html>")).toThrow(/networks/);
  });
});

describe("parseMonthArchive", () => {
  const month = parseMonthArchive(fx("minfin-month.html"));
  const days = Object.keys(month).sort();

  it("covers September 2026 with ISO day keys", () => {
    expect(days).toHaveLength(22);
    expect(days[0]).toBe("2026-09-01");
    expect(days.at(-1)).toBe("2026-09-30");
    for (const d of days) expect(d).toMatch(/^2026-09-\d{2}$/);
  });

  it("reads all columns", () => {
    expect(month["2026-09-01"]).toEqual({ a95p: 84.03, a95: 80.32, a92: 76.87, dt: 91.41, lpg: 43.06 });
    expect(month["2026-09-30"]).toEqual({ a95p: 93.55, a95: 89.26, a92: 85.93, dt: 98.43, lpg: 43.92 });
  });
});

describe("parseSvgHistory / parseSvgKey", () => {
  const hist = parseSvgHistory(fx("minfin-wog.svg"));
  const days = Object.keys(hist).sort();

  it("extracts 67 days of history", () => {
    expect(days).toHaveLength(67);
    expect(days[0]).toBe("2026-07-13");
    expect(days.at(-1)).toBe("2026-10-13");
  });

  it("maps series by hintbox order (А 95+, А 95, ДТ)", () => {
    expect(hist["2026-10-13"]).toEqual({ a95p: 95.9, a95: 92.9, dt: 99.9 });
    expect(hist["2026-07-13"]).toEqual({ a95p: 81.9, a95: 78.9, dt: 79.9 });
  });

  it("respects a different series order", () => {
    const svg =
      `<g id="hintbox"><text x="7" y="1">ДТ</text><text x="7" y="2">А 95</text></g>` +
      `<g onmouseover="sh(1,2,3,'01.02.2026 80,5 70,25')"/>`;
    expect(parseSvgHistory(svg)).toEqual({ "2026-02-01": { dt: 80.5, a95: 70.25 } });
  });

  it("returns {} for non-chart input", () => {
    expect(parseSvgHistory("<svg/>")).toEqual({});
  });

  it("parseSvgKey finds the chart key on the Kyiv page only", () => {
    expect(parseSvgKey(fx("minfin-kyiv.html"))).toBe("reg:cae8e5e2f1eae0ff");
    expect(parseSvgKey("<html></html>")).toBeUndefined();
    expect(parseSvgKey("x svg.inc.php?grad=5&indKey=tm:574f47&sync=1")).toBe("tm:574f47");
  });
});
