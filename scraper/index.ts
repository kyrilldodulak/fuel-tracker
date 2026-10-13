/**
 * Daily scrape:   npx tsx scraper/index.ts
 * One-off backfill (minfin monthly archive since 2015 + ~3 months of per-network/Kyiv charts):
 *                 npx tsx scraper/index.ts --backfill
 *
 * One-off Glavcom archive backfill of premium diesel (ДП+) / А-95+ per network (monthly sitemaps, ~1 req/s):
 *                 npx tsx scraper/index.ts --backfill-glavcom
 *
 * Every source is isolated: a failure is recorded in data/meta.json and never aborts the run.
 */
import type { AveragesFile, BrandsFile, FuelPrices, MetaFile, NetworksFile } from "../lib/types";
import { TRACKED_NETWORKS } from "../lib/types";
import { fetchText, kyivToday } from "./http";
import * as minfin from "./sources/minfin";
import { fetchGlavcomArchive, fillAverages, fillMissingFuels, parseGlavcomDate, parseGlavcomTable } from "./sources/glavcom";
import { glavcomArticleUrls, NETWORK_ADAPTERS } from "./sources/networks";
import { mergeDays, readJson, writeJson } from "./store";

const averages = readJson<AveragesFile>("averages.json", { ua: {}, kyiv: {} });
const networks = readJson<NetworksFile>("networks.json", { ua: {}, kyiv: {} });
const brands = readJson<BrandsFile>("brands.json", {});
const meta = readJson<MetaFile>("meta.json", { lastUpdated: "", sources: {} });

async function run(name: string, fn: () => Promise<number>) {
  const at = new Date().toISOString();
  try {
    const count = await fn();
    meta.sources[name] = { ok: true, at, count };
    console.log(`✓ ${name} (${count})`);
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    meta.sources[name] = { ok: false, at, error };
    console.warn(`::warning::${name} failed: ${error}`);
  }
}

async function daily() {
  await run("minfin:ua", async () => {
    const { date, prices } = await minfin.fetchUaAverages();
    mergeDays(averages.ua, { [date]: prices }, true);
    return Object.keys(prices).length;
  });
  await run("minfin:networks", async () => {
    const { date, networks: n } = await minfin.fetchUaNetworks();
    mergeDays(networks.ua, { [date]: n }, true);
    return Object.keys(n).length;
  });
  await run("minfin:kyiv", async () => {
    const k = await minfin.fetchKyiv();
    mergeDays(averages.kyiv, { [k.averages.date]: k.averages.prices }, true);
    mergeDays(networks.kyiv, { [k.networks.date]: k.networks.networks }, true);
    return Object.keys(k.networks.networks).length;
  });
  const today = kyivToday();
  for (const [slug, adapter] of Object.entries(NETWORK_ADAPTERS)) {
    await run(`site:${slug}`, async () => {
      const items = await adapter();
      if (!items.length) throw new Error("no prices parsed");
      (brands[today] ??= {})[slug] = items;
      return items.length;
    });
  }
}

/** Fuels taken from Glavcom: only what minfin doesn't give (never overwrites existing values). */
const GLAVCOM_FUELS = ["dtp", "a95p"] as const;

function applyGlavcom(days: Record<string, Record<string, FuelPrices>>) {
  const written = fillMissingFuels(networks.ua, days, GLAVCOM_FUELS);
  const dayList = Object.keys(days);
  fillAverages(averages, networks, dayList, "dtp", "ua");
  fillAverages(averages, networks, dayList, "dtp", "kyiv", true);
  return written;
}

async function glavcomToday() {
  await run("glavcom:today", async () => {
    const urls = glavcomArticleUrls(await fetchText("https://glavcom.ua/economics/personal-money/")).slice(0, 3);
    for (const url of urls) {
      const html = await fetchText(url);
      const date = parseGlavcomDate(html);
      const table = parseGlavcomTable(html);
      if (!date || !Object.keys(table).length) continue;
      return applyGlavcom({ [date]: table });
    }
    throw new Error("no glavcom article with a price table");
  });
}

async function backfillGlavcom() {
  await run("backfill:glavcom", async () => {
    const until = kyivToday();
    const since = new Date(Date.now() - 400 * 864e5).toISOString().slice(0, 10);
    const days = await fetchGlavcomArchive(since, until, (m) => console.log(m));
    const n = applyGlavcom(days);
    console.log(`${Object.keys(days).length} days, ${n} values`);
    return Object.keys(days).length;
  });
}

async function backfill() {
  await run("backfill:archive", async () => {
    const hist = await minfin.fetchArchive("2015-06", undefined, (m) => process.stdout.write(`${m} `));
    console.log();
    mergeDays(averages.ua, hist, false);
    return Object.keys(hist).length;
  });
  await run("backfill:kyiv", async () => {
    const { svgKey } = await minfin.fetchKyiv();
    if (!svgKey) throw new Error("no chart key");
    const hist = await minfin.fetchSvgHistory(svgKey);
    mergeDays(averages.kyiv, hist, false);
    return Object.keys(hist).length;
  });
  for (const { slug } of TRACKED_NETWORKS) {
    await run(`backfill:${slug}`, async () => {
      const hist = await minfin.fetchNetworkHistory(slug);
      for (const [day, prices] of Object.entries(hist)) {
        const row = (networks.ua[day] ??= {});
        row[slug] ??= prices;
      }
      return Object.keys(hist).length;
    });
  }
}

if (process.argv.includes("--backfill-glavcom")) await backfillGlavcom();
else {
  if (process.argv.includes("--backfill")) await backfill();
  await daily();
  await glavcomToday();
}

meta.lastUpdated = new Date().toISOString();
writeJson("averages.json", averages);
writeJson("networks.json", networks);
writeJson("brands.json", brands);
writeJson("meta.json", meta);
