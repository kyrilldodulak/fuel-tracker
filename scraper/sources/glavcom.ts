import zlib from "node:zlib";
import * as cheerio from "cheerio";
import type { AveragesFile, Fuel, FuelPrices, NetworksFile, Region } from "../../lib/types";
import { fetchText, parsePrice, sleep } from "../http";

// Glavcom publishes a daily per-network table ("Ціни на пальне <date>"). Its monthly sitemaps
// (/pub/sitemaps/YYYY-MM.xml.gz) enumerate the archive; /archive.html and /search are robots-disallowed.

/** Logo alt (lowercased) → minfin slug. Networks not listed (e.g. KLO) are skipped. */
const ALT_SLUGS: Record<string, string> = {
  upg: "upg",
  okko: "okko",
  wog: "wog",
  socar: "socar",
  ukrnafta: "ukrnafta",
};

/** Column header → fuel key (А100 is ignored). */
const HEAD_FUELS: Record<string, Fuel> = { "А95": "a95", "А95+": "a95p", "ДП": "dt", "ДП+": "dtp", "А92": "a92", "Газ": "lpg" };

const MONTHS = [
  "січня", "лютого", "березня", "квітня", "травня", "червня",
  "липня", "серпня", "вересня", "жовтня", "листопада", "грудня",
];

/** Date the prices refer to: "… 13 жовтня 2026 …" in the title/h1; fallback to article:published_time. */
export function parseGlavcomDate(html: string): string | undefined {
  const $ = cheerio.load(html);
  const text = `${$("h1.post_title").first().text()} | ${$("title").first().text()}`;
  const m = text.match(new RegExp(`(\\d{1,2})\\s+(${MONTHS.join("|")})\\s+(20\\d\\d)`));
  if (m) return `${m[3]}-${String(MONTHS.indexOf(m[2]) + 1).padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  return $("meta[property='article:published_time']").attr("content")?.slice(0, 10);
}

/** Table → { slug: prices } for tracked networks. Missing/non-numeric cells are omitted. */
export function parseGlavcomTable(html: string): Record<string, FuelPrices> {
  const $ = cheerio.load(html);
  const out: Record<string, FuelPrices> = {};
  for (const table of $("table").toArray()) {
    const heads = $(table)
      .find("thead th")
      .toArray()
      .map((th) => HEAD_FUELS[$(th).text().replace(/[\s\u00a0]/g, "")]);
    if (!heads.some(Boolean)) continue;
    for (const tr of $(table).find("tbody tr").toArray()) {
      const alt = $(tr).find("img").first().attr("alt")?.trim().toLowerCase();
      const slug = alt ? ALT_SLUGS[alt] : undefined;
      if (!slug) continue;
      const prices: FuelPrices = {};
      $(tr)
        .find("td")
        .toArray()
        .slice(1)
        .forEach((td, i) => {
          const fuel = heads[i + 1];
          const p = fuel && parsePrice($(td).text().match(/\d[\d\s]*[.,]\d+/)?.[0]);
          if (fuel && p) prices[fuel] = p;
        });
      if (Object.keys(prices).length) out[slug] = { ...out[slug], ...prices };
    }
    if (Object.keys(out).length) break;
  }
  return out;
}

/** Fuel-price article URLs from a sitemap XML (section /economics/personal-money/, slug has a date). */
export function glavcomSitemapUrls(xml: string): string[] {
  return [...xml.matchAll(/<loc>(https:\/\/glavcom\.ua\/economics\/personal-money\/[^<]+?\.html)<\/loc>/g)]
    .map((m) => m[1])
    .filter((u) => /(palne|azs)/.test(u) && /-\d{1,2}-[a-z]+-20\d\d/.test(u) && /tsini-na-(palne|azs)|na-(azs|palne)/.test(u));
}

async function fetchGz(url: string): Promise<string> {
  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" }, signal: AbortSignal.timeout(60_000) });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return zlib.gunzipSync(Buffer.from(await res.arrayBuffer())).toString("utf8");
}

/** Walks monthly sitemaps from `sinceDay` to today and parses each article (≤1 req/s). */
export async function fetchGlavcomArchive(
  sinceDay: string,
  untilDay: string,
  log: (m: string) => void = () => {},
): Promise<Record<string, Record<string, FuelPrices>>> {
  const months: string[] = [];
  for (let [y, m] = sinceDay.slice(0, 7).split("-").map(Number); `${y}-${String(m).padStart(2, "0")}` <= untilDay.slice(0, 7); m === 12 ? (y++, (m = 1)) : m++)
    months.push(`${y}-${String(m).padStart(2, "0")}`);
  const days: Record<string, Record<string, FuelPrices>> = {};
  for (const month of months) {
    let urls: string[] = [];
    try {
      urls = glavcomSitemapUrls(await fetchGz(`https://glavcom.ua/pub/sitemaps/${month}.xml.gz`));
    } catch (e) {
      log(`sitemap ${month}: ${e instanceof Error ? e.message : e}`);
    }
    await sleep(1000);
    urls.sort((a, b) => Number(a.match(/-(\d+)\.html$/)?.[1]) - Number(b.match(/-(\d+)\.html$/)?.[1]));
    for (const url of urls) {
      try {
        const html = await fetchText(url);
        const day = parseGlavcomDate(html);
        const table = parseGlavcomTable(html);
        if (day && day >= sinceDay && day <= untilDay && Object.keys(table).length) {
          const row = (days[day] ??= {});
          for (const [slug, p] of Object.entries(table)) row[slug] = { ...row[slug], ...p }; // later article wins
        }
      } catch (e) {
        log(`skip ${url}: ${e instanceof Error ? e.message : e}`);
      }
      await sleep(1000);
    }
    log(`${month}: ${urls.length} articles`);
  }
  return days;
}

/** Sets only missing fuels (never overwrites). Returns number of values written. */
export function fillMissingFuels(
  target: Record<string, Record<string, FuelPrices>>,
  incoming: Record<string, Record<string, FuelPrices>>,
  fuels: readonly Fuel[],
): number {
  let n = 0;
  for (const [day, nets] of Object.entries(incoming)) {
    for (const [slug, prices] of Object.entries(nets)) {
      for (const fuel of fuels) {
        const v = prices[fuel];
        if (v === undefined) continue;
        const row = ((target[day] ??= {})[slug] ??= {});
        if (row[fuel] === undefined) {
          row[fuel] = v;
          n++;
        }
      }
    }
  }
  return n;
}

/**
 * For days where the average `fuel` is missing and ≥2 networks have it, sets the mean (2 decimals).
 * Only days that already exist in both `averages` and `networks`-incoming are touched.
 */
export function fillAverages(
  averages: AveragesFile,
  networks: NetworksFile,
  days: string[],
  fuel: Fuel,
  region: Region,
  requireNetworkDay = false,
): number {
  let n = 0;
  for (const day of days) {
    const avg = averages[region][day];
    if (!avg || avg[fuel] !== undefined) continue;
    const netDay = networks[region][day];
    if (requireNetworkDay && !netDay) continue;
    const vals = Object.values(networks.ua[day] ?? {})
      .map((p) => p[fuel])
      .filter((v): v is number => v !== undefined);
    if (vals.length < 2) continue;
    avg[fuel] = Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100) / 100;
    n++;
  }
  return n;
}
