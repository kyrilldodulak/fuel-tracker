import vm from "node:vm";
import * as cheerio from "cheerio";
import type { BrandPrice } from "../../../lib/types";
import { fetchText, parsePrice } from "../../http";
import { classifyAll } from "../../normalize";

// Each adapter: network website HTML → brand prices. Keyed by minfin slug.

/** wog.ua/ua/fuels — server-rendered cards: type ("ДП"/"95") + brand ("Mustang+") + price. */
export function parseWog(html: string): BrandPrice[] {
  const $ = cheerio.load(html);
  return classifyAll(
    $("[class*='s_fuel_item']")
      .toArray()
      .map((el) => {
        const type = $(el).find("[class*='s_type']").text().trim();
        const brand = $(el).find("[class*='s_brand']").text().trim();
        const name = type === "ДП" ? `ДП ${brand}` : `${type} ${brand}`;
        return [name.trim(), parsePrice($(el).find("[class*='s_price']").text())];
      }),
  );
}

/** okko.ua/fuels — Nuxt payload; objects with {title, price, fuel_code}. */
export function parseOkko(html: string): BrandPrice[] {
  const script = html.match(/window\.__NUXT__=(.*?);?<\/script>/s)?.[1];
  if (!script) throw new Error("okko: __NUXT__ payload not found");
  const ctx: { window: { __NUXT__?: unknown } } = { window: {} };
  vm.createContext(ctx);
  vm.runInContext(`window.__NUXT__=${script}`, ctx, { timeout: 2000 });
  const found: { fuel_code: string; price: string; title: string }[] = [];
  (function walk(o: unknown) {
    if (!o || typeof o !== "object") return;
    const r = o as Record<string, unknown>;
    if ("fuel_code" in r && "price" in r) found.push(r as never);
    for (const k in r) walk(r[k]);
  })(ctx.window.__NUXT__);
  const seen = new Set<string>();
  return classifyAll(
    found
      .filter((f) => !seen.has(f.fuel_code) && seen.add(f.fuel_code))
      .map((f) => [f.fuel_code === "DP" ? "ДП" : f.fuel_code === "SPBT" ? "Газ" : f.fuel_code, parsePrice(f.price)]),
  );
}

/** socar.ua/fuel — headings with "*Ціна: 104 грн/л" below. */
export function parseSocar(html: string): BrandPrice[] {
  const re = /<h[23][^>]*two-image-and-content__title[^>]*>\s*([^<]+?)\s*<\/h[23]>[\s\S]*?Ціна:\s*([\d.,]+)\s*грн/g;
  const items: [string, number | undefined][] = [];
  for (const m of html.matchAll(re)) items.push([m[1], parsePrice(m[2])]);
  return classifyAll(items);
}

/** upg.ua/cini-na-palne — inline `var obj = {data:[{RegionName, Title, AveragePrice}]}`; we take Київська. */
export function parseUpg(html: string, region = "Київська"): BrandPrice[] {
  const json = html.match(/var obj = (\{.*?\});/s)?.[1];
  if (!json) throw new Error("upg: obj payload not found");
  const rows = (JSON.parse(json).data ?? []) as { RegionName: string; Title: string; AveragePrice: string }[];
  const names: Record<string, string> = {
    upg100: "UPG 100",
    upg95: "UPG 95",
    upgDIESEL: "UPG Diesel",
    "EURO DIESEL": "ДП Euro",
  };
  return classifyAll(
    rows.filter((r) => r.RegionName === region).map((r) => [names[r.Title] ?? r.Title, parsePrice(r.AveragePrice)]),
  );
}

/**
 * Fallback for networks whose own sites are behind Cloudflare (БРСМ, Укрнафта):
 * the minfin operator page lists products by name ("Бензин А-95 преміум | 91,90", Ukrainian version of the page).
 */
export function parseMinfinOperator(html: string): BrandPrice[] {
  const $ = cheerio.load(html);
  return classifyAll(
    $("table.line")
      .first()
      .find("tr")
      .toArray()
      .map((tr) => [
        $(tr).find("td").first().text().replace(/\u00ad/g, "").replace(/\u00a0/g, " ").replace(/^Бензин /, "").trim(),
        parsePrice($(tr).find("big").first().text()),
      ]),
  );
}

const minfinOperator = (slug: string) => async () =>
  parseMinfinOperator(await fetchText(`https://index.minfin.com.ua/ua/markets/fuel/tm/${slug}/`));

export const NETWORK_ADAPTERS: Record<string, () => Promise<BrandPrice[]>> = {
  brsmnafta: minfinOperator("brsmnafta"),
  ukrnafta: minfinOperator("ukrnafta"),
  wog: async () => parseWog(await fetchText("https://wog.ua/ua/fuels/")),
  okko: async () => parseOkko(await fetchText("https://www.okko.ua/fuels")),
  socar: async () => parseSocar(await fetchText("https://socar.ua/fuel")),
  upg: async () => parseUpg(await fetchText("https://upg.ua/cini-na-palne/")),
};
