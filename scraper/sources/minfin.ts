import * as cheerio from "cheerio";
import type { Element } from "domhandler";
import type { Day, Fuel, FuelPrices } from "../../lib/types";
import { fetchText, parsePrice, ruDateToIso, sleep } from "../http";

export const MINFIN = "https://index.minfin.com.ua/markets/fuel";

/** Maps minfin column headers / row labels to our fuel keys. */
export function fuelFromLabel(raw: string): Fuel | undefined {
  const s = raw.replace(/\u00ad/g, "").replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim().toLowerCase();
  if (/^(а|a) ?95 ?\+$|95 премиум/.test(s)) return "a95p";
  if (/^(а|a) ?95$|бензин а-95$/.test(s)) return "a95";
  if (/^(а|a) ?92$|бензин а-92$/.test(s)) return "a92";
  if (/^дт ?\+$|дизельное топливо премиум/.test(s)) return "dtp";
  if (/^дт$|^дизельное топливо$/.test(s)) return "dt";
  if (/^газ/.test(s)) return "lpg";
  return undefined;
}

function captionDate($: cheerio.CheerioAPI, table: cheerio.Cheerio<Element>): Day | undefined {
  const m = table.find("caption").text().match(/(\d{2}\.\d{2}\.\d{4})/);
  return m ? ruDateToIso(m[1]) : undefined;
}

/** Summary table (class 'line'): "Бензин А-95 премиум | 93,50 | …". Used on the UA and region pages. */
export function parseAverages(html: string): { date: Day; prices: FuelPrices } {
  const $ = cheerio.load(html);
  const table = $("table.line").first();
  const date = captionDate($, table);
  if (!date) throw new Error("minfin: averages table/date not found");
  const prices: FuelPrices = {};
  table.find("tr").each((_, tr) => {
    const fuel = fuelFromLabel($(tr).find("td").first().text());
    const price = parsePrice($(tr).find("big").first().text());
    if (fuel && price) prices[fuel] = price;
  });
  return { date, prices };
}

/** Fuel columns of a 'zebra' table; they are always the trailing cells of each row. */
function headerFuels($: cheerio.CheerioAPI, table: cheerio.Cheerio<Element>): Fuel[] {
  return table
    .find("tr")
    .first()
    .find("th")
    .toArray()
    .map((th) => fuelFromLabel($(th).text()))
    .filter((f): f is Fuel => !!f);
}

/** Operator table (class 'zebra', first link = /markets/fuel/tm/<slug>/). */
export function parseNetworks(html: string): { date: Day; networks: Record<string, FuelPrices> } {
  const $ = cheerio.load(html);
  const table = $("table.zebra")
    .filter((_, t) => $(t).find("a[href*='/markets/fuel/tm/']").length > 0)
    .first();
  const date = captionDate($, table);
  if (!date) throw new Error("minfin: networks table/date not found");
  const fuels = headerFuels($, table);
  const networks: Record<string, FuelPrices> = {};
  table.find("tr").each((_, tr) => {
    const link = $(tr).find("td a[href*='/markets/fuel/tm/']").attr("href");
    const slug = link?.match(/\/tm\/([^/]+)\//)?.[1];
    if (!slug) return;
    const cells = $(tr).find("td").toArray().slice(-fuels.length);
    const prices: FuelPrices = {};
    cells.forEach((td, i) => {
      const fuel = fuels[i];
      const price = parsePrice($(td).text());
      if (fuel && price) prices[fuel] = price;
    });
    if (Object.keys(prices).length) networks[slug] = prices;
  });
  return { date, networks };
}

/** Monthly archive table: Дата | А 95+ | А 95 | А 92 | ДТ | ДТ+ | Газ. */
export function parseMonthArchive(html: string): Record<Day, FuelPrices> {
  const $ = cheerio.load(html);
  const table = $("table.zebra").first();
  const fuels = headerFuels($, table);
  const out: Record<Day, FuelPrices> = {};
  table.find("tr").each((_, tr) => {
    const tds = $(tr).find("td").toArray();
    const m = $(tds[0]).text().match(/(\d{2}\.\d{2}\.\d{4})/);
    if (!m) return;
    const prices: FuelPrices = {};
    tds.slice(-fuels.length).forEach((td, i) => {
      const fuel = fuels[i];
      const price = parsePrice($(td).text());
      if (fuel && price) prices[fuel] = price;
    });
    if (Object.keys(prices).length) out[ruDateToIso(m[1])] = prices;
  });
  return out;
}

/** Key for the page's SVG chart, e.g. "tm:574f47" or "reg:cae8…". */
export function parseSvgKey(html: string): string | undefined {
  return html.match(/svg\.inc\.php\?grad=5&indKey=([^&']+)/)?.[1];
}

/**
 * The SVG chart embeds ~3 months of daily points in hover handlers:
 * sh(x,y,z,'13.07.2026 81,9 78,9 79,9') with series labels in the hint box.
 */
export function parseSvgHistory(svg: string): Record<Day, FuelPrices> {
  const hintBox = svg.match(/<g id="hintbox">([\s\S]*?)<\/g>/)?.[1] ?? "";
  const labels = [...hintBox.matchAll(/<text x="7"[^>]*>([^<]+)<\/text>/g)].map((m) => fuelFromLabel(m[1]));
  const out: Record<Day, FuelPrices> = {};
  for (const m of svg.matchAll(/sh\([^']*'(\d{2}\.\d{2}\.\d{4})((?: [^ ']*)*)'\)/g)) {
    const values = m[2].split(" ").slice(1);
    const prices: FuelPrices = {};
    values.forEach((v, i) => {
      const fuel = labels[i];
      const price = parsePrice(v);
      if (fuel && price) prices[fuel] = price;
    });
    if (Object.keys(prices).length) out[ruDateToIso(m[1])] = prices;
  }
  return out;
}

// ---- fetchers ----

export async function fetchUaAverages() {
  return parseAverages(await fetchText(`${MINFIN}/`));
}

export async function fetchUaNetworks() {
  return parseNetworks(await fetchText(`${MINFIN}/tm/`));
}

/** Kyiv region page has both a summary table and an operator table. */
export async function fetchKyiv() {
  const html = await fetchText(`${MINFIN}/reg/kievskaya/`);
  return { averages: parseAverages(html), networks: parseNetworks(html), svgKey: parseSvgKey(html) };
}

export async function fetchSvgHistory(key: string) {
  return parseSvgHistory(await fetchText(`${MINFIN}/svg.inc.php?grad=5&indKey=${key}&sync=1`));
}

export async function fetchNetworkHistory(slug: string) {
  const key = parseSvgKey(await fetchText(`${MINFIN}/tm/${slug}/`));
  if (!key) throw new Error(`minfin: no chart for ${slug}`);
  return fetchSvgHistory(key);
}

/** All months from 2015-06 to `until` (YYYY-MM). */
export async function fetchArchive(from = "2015-06", until?: string, onMonth?: (m: string) => void) {
  const out: Record<Day, FuelPrices> = {};
  const end = until ?? new Date().toISOString().slice(0, 7);
  for (let [y, mo] = from.split("-").map(Number); `${y}-${String(mo).padStart(2, "0")}` <= end; ) {
    const month = `${y}-${String(mo).padStart(2, "0")}`;
    onMonth?.(month);
    Object.assign(out, parseMonthArchive(await fetchText(`${MINFIN}/${month}/`)));
    await sleep(400);
    mo++;
    if (mo > 12) [y, mo] = [y + 1, 1];
  }
  return out;
}
