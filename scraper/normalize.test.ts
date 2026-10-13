import { describe, expect, it } from "vitest";
import { parsePrice, ruDateToIso } from "./http";
import { classify, classifyAll } from "./normalize";

describe("classify", () => {
  it.each([
    ["Mustang+", "other", true],
    ["95 Mustang Євро5-Е10", "95", true],
    ["ДП Mustang+", "diesel", true],
    ["Pulls Diesel", "diesel", true],
    ["NANO ДП", "diesel", true],
    ["UPG Diesel", "diesel", true],
    ["UPG 95", "95", true],
    ["А-95 преміум", "95", true],
    ["A-95 Premium", "95", true],
    ["100", "100", true],
    ["Pulls 98", "98", true],
    ["ДП", "diesel", false],
    ["ДП Euro", "diesel", false],
    ["Дизельне паливо", "diesel", false],
    ["A-95", "95", false],
    ["А-92", "92", false],
    ["Газ", "lpg", false],
    ["LPG", "lpg", false],
    ["Пропан-бутан", "other", false],
  ])("%s", (name, base, premium) => {
    const r = classify(name, 50)!;
    expect(r).toMatchObject({ base, premium, price: 50 });
  });

  it("excludes AdBlue in any case", () => {
    expect(classify("AdBlue", 30)).toBeUndefined();
    expect(classify("ADBLUE 10л", 30)).toBeUndefined();
  });

  it("never marks LPG as premium, even with '+'", () => {
    expect(classify("Газ+", 48)).toMatchObject({ base: "lpg", premium: false });
  });

  it("collapses whitespace in the name", () => {
    expect(classify("  ДП \n  Mustang+ ", 99)!.name).toBe("ДП Mustang+");
  });

  it("diesel wins over digits", () => {
    expect(classify("Diesel 95", 50)!.base).toBe("diesel");
  });
});

describe("classifyAll", () => {
  it("drops items with missing price or AdBlue", () => {
    const r = classifyAll([
      ["ДП", 99.9],
      ["A-95", undefined],
      ["AdBlue", 40],
      ["Газ", 48.9],
    ]);
    expect(r.map((i) => i.name)).toEqual(["ДП", "Газ"]);
  });
});

describe("parsePrice", () => {
  it.each([
    ["93,50", 93.5],
    ["93.5", 93.5],
    [" 1 02,9 ", 102.9],
    ["104", 104],
  ])("%j -> %s", (s, n) => expect(parsePrice(s)).toBe(n));

  it.each(["", "<br>", "abc", "10", "500", "9,99", "1000", "-50"])("%j -> undefined", (s) =>
    expect(parsePrice(s)).toBeUndefined(),
  );

  it("handles undefined", () => {
    expect(parsePrice(undefined)).toBeUndefined();
  });
});

describe("ruDateToIso", () => {
  it("converts DD.MM.YYYY", () => {
    expect(ruDateToIso("13.10.2026")).toBe("2026-10-13");
    expect(ruDateToIso("01.09.2026")).toBe("2026-09-01");
  });
});
