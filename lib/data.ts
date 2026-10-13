import averagesRaw from "@/data/averages.json";
import networksRaw from "@/data/networks.json";
import brandsRaw from "@/data/brands.json";
import metaRaw from "@/data/meta.json";
import {
  FUELS,
  TRACKED_NETWORKS,
  type AveragesFile,
  type BrandPrice,
  type BrandsFile,
  type Day,
  type Fuel,
  type FuelPrices,
  type MetaFile,
  type NetworksFile,
  type Region,
} from "./types";

export type Column = (number | null)[];
export type FuelColumns = Partial<Record<Fuel, Column>>;

export interface AverageSeries {
  dates: Day[];
  fuels: FuelColumns;
}

export interface NetworkSeries {
  dates: Day[];
  bySlug: Record<string, FuelColumns>;
}

export interface NetworkBrands {
  slug: string;
  name: string;
  items: BrandPrice[];
}

export interface DashboardData {
  /** Latest day with national averages; "now" for all relative periods. */
  today: Day;
  firstDay: Day;
  averages: Record<Region, AverageSeries>;
  networks: Record<Region, NetworkSeries>;
  networkNames: Record<string, string>;
  brandsDay: Day | null;
  brands: NetworkBrands[];
}

const averages = averagesRaw as unknown as AveragesFile;
const networks = networksRaw as unknown as NetworksFile;
const brands = brandsRaw as unknown as BrandsFile;
export const meta = metaRaw as unknown as MetaFile;

/** Brand-derived fuels: premium diesel (dtp) and premium 95 (a95p), when minfin lacks them. */
const BRAND_FUELS: { fuel: Fuel; base: BrandPrice["base"] }[] = [
  { fuel: "dtp", base: "diesel" },
  { fuel: "a95p", base: "95" },
];

/** Cheapest premium item of `base` for a network on a day (SOCAR lists two premium diesels). */
export function cheapestPremium(items: BrandPrice[] | undefined, base: BrandPrice["base"]): BrandPrice | null {
  const list = (items ?? []).filter((b) => b.premium && b.base === base);
  return list.length ? list.reduce((a, b) => (b.price < a.price ? b : a)) : null;
}

/** Averages/networks with missing dtp/a95p filled from network websites (brands.json). Brand prices are national (UPG: Kyiv region). */
function withBrandFuels(region: Region): { avg: Record<Day, FuelPrices>; net: Record<Day, Record<string, FuelPrices>> } {
  const avg: Record<Day, FuelPrices> = { ...(averages[region] ?? {}) };
  const net: Record<Day, Record<string, FuelPrices>> = { ...(networks[region] ?? {}) };
  for (const day of Object.keys(brands)) {
    for (const { fuel, base } of BRAND_FUELS) {
      const tracked: number[] = [];
      for (const { slug } of TRACKED_NETWORKS) {
        const price = cheapestPremium(brands[day][slug], base)?.price;
        if (price == null) continue;
        if (net[day]) {
          const cur = net[day][slug] ?? {};
          if (cur[fuel] == null) net[day] = { ...net[day], [slug]: { ...cur, [fuel]: price } };
        }
        tracked.push(net[day]?.[slug]?.[fuel] ?? price);
      }
      if (avg[day] && avg[day][fuel] == null && tracked.length) {
        const m = tracked.reduce((a, b) => a + b, 0) / tracked.length;
        avg[day] = { ...avg[day], [fuel]: Math.round(m * 100) / 100 };
      }
    }
  }
  return { avg, net };
}

/** Days of history kept at daily resolution; older days are averaged into weeks at build time. */
const DAILY_WINDOW = 365;
const WEEK_MS = 7 * 86_400_000;

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Weekly averages (dated by the first day present) for days older than the daily window. */
function downsample(dates: Day[], cols: Column[]): { dates: Day[]; cols: Column[] } {
  const last = dates.at(-1);
  if (!last) return { dates, cols };
  const cutoff = new Date(Date.parse(`${last}T00:00:00Z`) - DAILY_WINDOW * 86_400_000).toISOString().slice(0, 10);
  const outDates: Day[] = [];
  const sums: { sum: number; n: number }[][] = cols.map(() => []);
  let bucket = -1;
  let bucketIdx = -1;
  dates.forEach((d, i) => {
    const weekly = d < cutoff;
    const b = weekly ? Math.floor(Date.parse(`${d}T00:00:00Z`) / WEEK_MS) : -2 - i;
    if (b !== bucket) {
      bucket = b;
      bucketIdx++;
      outDates.push(d);
    }
    cols.forEach((col, c) => {
      const v = col[i];
      if (v == null) return;
      const acc = (sums[c][bucketIdx] ??= { sum: 0, n: 0 });
      acc.sum += v;
      acc.n++;
    });
  });
  const outCols = cols.map((_, c) => outDates.map((__, k) => (sums[c][k] ? round2(sums[c][k].sum / sums[c][k].n) : null)));
  return { dates: outDates, cols: outCols };
}

function shapeAverages(region: Region): AverageSeries {
  const byDay = withBrandFuels(region).avg;
  const days = Object.keys(byDay).sort();
  const present = FUELS.filter((f) => days.some((d) => byDay[d]?.[f] != null));
  const ds = downsample(days, present.map((f) => days.map((d) => byDay[d]?.[f] ?? null)));
  const fuels: FuelColumns = {};
  present.forEach((f, i) => (fuels[f] = ds.cols[i]));
  return { dates: ds.dates, fuels };
}

function shapeNetworks(region: Region): NetworkSeries {
  const byDay = withBrandFuels(region).net;
  const days = Object.keys(byDay).sort();
  const keys: { slug: string; fuel: Fuel; col: Column }[] = [];
  for (const { slug } of TRACKED_NETWORKS) {
    for (const fuel of FUELS) {
      const col = days.map((d) => byDay[d][slug]?.[fuel] ?? null);
      if (col.some((v) => v != null)) keys.push({ slug, fuel, col });
    }
  }
  const ds = downsample(days, keys.map((k) => k.col));
  const bySlug: Record<string, FuelColumns> = {};
  keys.forEach((k, i) => ((bySlug[k.slug] ??= {})[k.fuel] = ds.cols[i]));
  return { dates: ds.dates, bySlug };
}

export function networkLabel(slug: string, names: Record<string, string>): string {
  return names[slug] ?? slug;
}

function buildNetworkNames(): Record<string, string> {
  return Object.fromEntries(TRACKED_NETWORKS.map((n) => [n.slug, n.name]));
}

export function loadDashboardData(): DashboardData {
  const avg = { ua: shapeAverages("ua"), kyiv: shapeAverages("kyiv") };
  const net = { ua: shapeNetworks("ua"), kyiv: shapeNetworks("kyiv") };
  const names = buildNetworkNames();

  const brandDays = Object.keys(brands).sort();
  const brandsDay = brandDays.at(-1) ?? null;
  const brandList: NetworkBrands[] = brandsDay
    ? Object.entries(brands[brandsDay]).map(([slug, items]) => ({
        slug,
        name: names[slug] ?? slug,
        items,
      }))
    : [];
  const order = TRACKED_NETWORKS.map((n) => n.slug);
  brandList.sort((a, b) => order.indexOf(a.slug) - order.indexOf(b.slug));

  return {
    today: avg.ua.dates.at(-1) ?? "",
    firstDay: avg.ua.dates[0] ?? "",
    averages: avg,
    networks: net,
    networkNames: names,
    brandsDay,
    brands: brandList,
  };
}

/** Value on `day`, or the nearest earlier one (within 5 days of gaps). */
export function valueAtOrBefore(dates: Day[], col: Column, day: Day): number | null {
  for (let i = dates.length - 1; i >= 0; i--) {
    if (dates[i] <= day) {
      // skip short gaps (weekends/missing days)
      for (let j = i; j >= 0 && j > i - 5; j--) if (col[j] != null) return col[j];
      return null;
    }
  }
  return null;
}

export interface PriceEntry {
  slug: string;
  name: string;
  /** Shelf price today, null when the network lacks this fuel. */
  price: number | null;
  /** Brand product name for premium fuels, e.g. "Mustang+". */
  brand?: string;
}

const PREMIUM_BASE: Partial<Record<Fuel, BrandPrice["base"]>> = { dtp: "diesel", a95p: "95" };

/** Latest shelf prices of `fuel` for every tracked network (price null when it lacks the fuel). */
export function priceEntries(
  series: NetworkSeries,
  names: Record<string, string>,
  fuel: Fuel,
  brands: NetworkBrands[],
): PriceEntry[] {
  const i = series.dates.length - 1;
  const base = PREMIUM_BASE[fuel];
  return TRACKED_NETWORKS.map(({ slug }) => {
    const price = series.bySlug[slug]?.[fuel]?.[i] ?? null;
    const item = base && price != null ? cheapestPremium(brands.find((b) => b.slug === slug)?.items, base) : null;
    return { slug, name: networkLabel(slug, names), price, brand: item?.price === price ? item.name : undefined };
  });
}
