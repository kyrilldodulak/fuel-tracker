import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { glavcomArticleUrls, mergeBrandPrices, parseGlavcomNetwork, parseMinfinOperator, parseOkko, parseSocar, parseUpg, parseWog } from "./sources/networks";

const fx = (f: string) => fs.readFileSync(path.join(import.meta.dirname, "__fixtures__", f), "utf8");
const by = (items: { name: string }[], name: string) => items.find((i) => i.name === name);

describe("parseWog", () => {
  const items = parseWog(fx("wog.html"));
  it("detects premium lines", () => {
    expect(by(items, "ДП Mustang+")).toEqual({ name: "ДП Mustang+", base: "diesel", premium: true, price: 102.9 });
    expect(by(items, "95 Mustang Євро5-Е10")).toMatchObject({ base: "95", premium: true, price: 95.9 });
    expect(by(items, "100 Mustang Євро5-Е0")).toMatchObject({ base: "100", premium: true });
  });
  it("keeps regular items non-premium", () => {
    expect(by(items, "ДП Євро5")).toMatchObject({ base: "diesel", premium: false, price: 99.9 });
    expect(by(items, "95 Євро5-Е10")).toMatchObject({ base: "95", premium: false, price: 92.9 });
    expect(by(items, "ГАЗ")).toMatchObject({ base: "lpg", premium: false, price: 48.9 });
  });
  it("has no AdBlue", () => {
    expect(items.some((i) => /adblue/i.test(i.name))).toBe(false);
  });
});

describe("parseOkko", () => {
  const items = parseOkko(fx("okko.html"));
  it("detects Pulls premium lines", () => {
    expect(by(items, "Pulls Diesel")).toEqual({ name: "Pulls Diesel", base: "diesel", premium: true, price: 102.9 });
    expect(by(items, "Pulls 95")).toMatchObject({ base: "95", premium: true, price: 95.9 });
    expect(by(items, "Pulls 100")).toMatchObject({ base: "100", premium: true });
  });
  it("maps DP/SPBT codes to regular diesel/lpg", () => {
    expect(by(items, "ДП")).toMatchObject({ base: "diesel", premium: false, price: 99.9 });
    expect(by(items, "Газ")).toMatchObject({ base: "lpg", premium: false, price: 48.9 });
    expect(by(items, "A-95")).toMatchObject({ base: "95", premium: false, price: 92.9 });
  });
  it("dedupes by fuel_code", () => {
    expect(items).toHaveLength(6);
  });
  it("throws without a NUXT payload", () => {
    expect(() => parseOkko("<html></html>")).toThrow(/__NUXT__/);
  });
});

describe("parseSocar", () => {
  const items = parseSocar(fx("socar.html"));
  it("detects Nano premium lines", () => {
    expect(by(items, "NANO ДП")).toEqual({ name: "NANO ДП", base: "diesel", premium: true, price: 103 });
    expect(by(items, "DIESEL NANO Extro")).toMatchObject({ base: "diesel", premium: true, price: 104 });
    expect(by(items, "NANO 95")).toMatchObject({ base: "95", premium: true, price: 97.9 });
    expect(by(items, "NANO 100")).toMatchObject({ base: "100", premium: true, price: 104 });
  });
  it("keeps regular items non-premium and excludes AdBlue", () => {
    expect(by(items, "Бензин А-95")).toMatchObject({ base: "95", premium: false, price: 94.9 });
    expect(by(items, "LPG")).toMatchObject({ base: "lpg", premium: false });
    expect(items.some((i) => /adblue/i.test(i.name))).toBe(false);
  });
});

describe("parseUpg", () => {
  const items = parseUpg(fx("upg.html"));
  it("takes the Kyiv region and renames brand codes", () => {
    expect(by(items, "UPG Diesel")).toEqual({ name: "UPG Diesel", base: "diesel", premium: true, price: 99.9 });
    expect(by(items, "UPG 95")).toMatchObject({ base: "95", premium: true, price: 91.9 });
    expect(by(items, "UPG 100")).toMatchObject({ base: "100", premium: true, price: 99.9 });
  });
  it("keeps regular items non-premium", () => {
    expect(by(items, "ДП Euro")).toMatchObject({ base: "diesel", premium: false, price: 97.9 });
    expect(by(items, "A-95")).toMatchObject({ base: "95", premium: false, price: 88.9 });
    expect(by(items, "Газ")).toMatchObject({ base: "lpg", premium: false, price: 46.9 });
  });
  it("returns nothing for an unknown region and throws without payload", () => {
    expect(parseUpg(fx("upg.html"), "Нема такої")).toEqual([]);
    expect(() => parseUpg("<html></html>")).toThrow(/obj/);
  });
});

describe("parseMinfinOperator", () => {
  const html = `<table class="line"><tr><td>Бензин А-95&nbsp;преміум</td><td><big>91,90</big></td></tr>
    <tr><td>Бензин А-95</td><td><big>88,90</big></td></tr>
    <tr><td>Дизельне пальне</td><td><big>96,50</big></td></tr>
    <tr><td>Дизельне пальне прем­іум+</td><td><big>99,50</big></td></tr>
    <tr><td>Газ</td><td><big></big></td></tr></table>`;
  const items = parseMinfinOperator(html);

  it("parses rows into classified items", () => {
    expect(items.map((i) => i.name)).toEqual(["А-95 преміум", "А-95", "Дизельне пальне", "Дизельне пальне преміум+"]);
    expect(items[0]).toEqual({ name: "А-95 преміум", base: "95", premium: true, price: 91.9 });
    expect(items[1]).toMatchObject({ base: "95", premium: false, price: 88.9 });
    expect(items[3]).toMatchObject({ base: "diesel", premium: true });
  });
  it("parses the real Ukrnafta operator page", () => {
    const real = parseMinfinOperator(fx("minfin-ukrnafta-tm.html"));
    expect(real.find((i) => i.name === "А-95 преміум")).toMatchObject({ base: "95", premium: true, price: 91.9 });
    expect(real.find((i) => i.base === "diesel")).toMatchObject({ premium: false, price: 97.9 });
    expect(real.some((i) => /­/.test(i.name))).toBe(false);
  });
  it("returns [] when there is no table.line", () => {
    expect(parseMinfinOperator(fx("wog.html"))).toEqual([]);
  });
});

describe("ukrnafta via glavcom", () => {
  it("parses Ukrnafta row incl. premium diesel ДП+", () => {
    const r = parseGlavcomNetwork(fx("glavcom-prices.html"));
    const dp = r.find((b) => b.base === "diesel" && b.premium);
    expect(dp).toMatchObject({ name: "ДП+", price: 99.9 });
    expect(r.find((b) => b.base === "diesel" && !b.premium)?.price).toBe(97.9);
    expect(r.find((b) => b.base === "lpg")?.price).toBe(44.9);
  });
  it("finds newest article url first", () => {
    const urls = glavcomArticleUrls(fx("glavcom-list.html"));
    expect(urls[0]).toMatch(/1148776\.html$/);
  });
  it("merges with minfin fallback, primary wins", () => {
    const g = parseGlavcomNetwork(fx("glavcom-prices.html"));
    const m = parseMinfinOperator(fx("minfin-ukrnafta-tm.html"));
    const merged = mergeBrandPrices(g, m);
    expect(merged.filter((b) => b.base === "95" && b.premium)).toHaveLength(1);
    expect(merged.some((b) => b.base === "diesel" && b.premium)).toBe(true);
  });
});
