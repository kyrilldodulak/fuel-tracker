import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { AveragesFile, NetworksFile } from "../lib/types";
import { fillAverages, fillMissingFuels, glavcomSitemapUrls, parseGlavcomDate, parseGlavcomTable } from "./sources/glavcom";

const fx = (f: string) => fs.readFileSync(path.join(import.meta.dirname, "__fixtures__", f), "utf8");

describe("glavcom archive parsing", () => {
  const old = fx("glavcom-2026-03-10.html");
  it("extracts the date from the title (with or without a headline prefix)", () => {
    expect(parseGlavcomDate(old)).toBe("2026-03-10");
    expect(parseGlavcomDate(fx("glavcom-prices.html"))).toBe("2026-10-13");
  });
  it("maps logo alt to slugs and columns to fuels, skipping unknown networks and А100", () => {
    const t = parseGlavcomTable(old);
    expect(Object.keys(t).sort()).toEqual(["brsmnafta", "okko", "socar", "ukrnafta", "upg", "wog"]);
    expect(t.okko).toEqual({ a95: 70.99, a95p: 73.99, dt: 75.99, dtp: 78.99, lpg: 41.99 });
    expect(t.upg.dtp).toBe(77.4);
  });
  it("omits missing cells and tolerates trend arrows", () => {
    const t = parseGlavcomTable(old);
    expect(t.ukrnafta.dtp).toBeUndefined();
    expect(t.brsmnafta).toEqual({ a95: 66.99, dt: 69.99, lpg: 38.49 });
    const n = parseGlavcomTable(fx("glavcom-prices.html"));
    expect(n.socar).toMatchObject({ a95: 94.9, dt: 103, dtp: 104 });
    expect(n.brsmnafta.dtp).toBeUndefined();
  });
  it("picks fuel articles with a date in the slug from a sitemap", () => {
    const xml = [
      "economics/personal-money/tsini-na-palne-10-bereznja-2026-skilki-koshtujut-benzin-dizel-ta-haz-na-azs-1107240",
      "economics/personal-money/tsini-na-med-v-ukrajini-padajut-1141058",
      "ru/news/tseny-na-toplivo-1-sentjabrja-2026-skolko-stojat-benzin-dizel-i-haz-na-azs-1140032",
      "economics/personal-money/avtohaz-podorozhchav-tsini-na-azs-10-zhovtnja-2026-roku-1148309",
    ]
      .map((p) => `<loc>https://glavcom.ua/${p}.html</loc>`)
      .join("");
    expect(glavcomSitemapUrls(xml)).toHaveLength(2);
  });
});

describe("glavcom fill", () => {
  it("fills only missing fuels and means only missing averages", () => {
    const networks: NetworksFile = { ua: { d: { okko: { dt: 90, dtp: 1 } } }, kyiv: { d: {} } };
    const averages: AveragesFile = { ua: { d: { dt: 90 }, e: {} }, kyiv: { d: {} } };
    const incoming = { d: { okko: { dt: 5, dtp: 2, a95p: 3 }, wog: { dtp: 4 } } };
    fillMissingFuels(networks.ua, incoming, ["dtp", "a95p"]);
    expect(networks.ua.d.okko).toEqual({ dt: 90, dtp: 1, a95p: 3 });
    expect(networks.ua.d.wog).toEqual({ dtp: 4 });
    expect(fillAverages(averages, networks, ["d", "e"], "dtp", "ua")).toBe(1);
    expect(averages.ua.d.dtp).toBe(2.5);
    expect(averages.ua.e.dtp).toBeUndefined();
    expect(fillAverages(averages, networks, ["d"], "dtp", "kyiv", true)).toBe(1);
    expect(averages.kyiv.d.dtp).toBe(2.5);
  });
});
