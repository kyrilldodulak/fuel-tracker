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

const REGIONS: Region[] = ["ua", "kyiv"];

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

function shapeAverages(region: Region): AverageSeries {
  const byDay = withBrandFuels(region).avg;
  const dates = Object.keys(byDay).sort();
  const fuels: FuelColumns = {};
  for (const f of FUELS) {
    const col = dates.map((d) => byDay[d]?.[f] ?? null);
    if (col.some((v) => v != null)) fuels[f] = col;
  }
  return { dates, fuels };
}

function shapeNetworks(region: Region): NetworkSeries {
  const byDay = withBrandFuels(region).net;
  const dates = Object.keys(byDay).sort();
  const bySlug: Record<string, FuelColumns> = {};
  dates.forEach((d, i) => {
    for (const [slug, prices] of Object.entries(byDay[d])) {
      const cols = (bySlug[slug] ??= {});
      for (const f of FUELS) {
        const v = prices[f];
        if (v == null) continue;
        (cols[f] ??= dates.map(() => null))[i] = v;
      }
    }
  });
  return { dates, bySlug };
}

export function networkLabel(slug: string, names: Record<string, string>): string {
  return names[slug] ?? slug;
}

function buildNetworkNames(slugs: Iterable<string>): Record<string, string> {
  const names: Record<string, string> = {};
  for (const s of slugs) names[s] = s.replace(/_/g, " ").toUpperCase();
  for (const n of TRACKED_NETWORKS) names[n.slug] = n.name;
  return names;
}

export function loadDashboardData(): DashboardData {
  const avg = { ua: shapeAverages("ua"), kyiv: shapeAverages("kyiv") };
  const net = { ua: shapeNetworks("ua"), kyiv: shapeNetworks("kyiv") };
  const slugs = new Set<string>();
  for (const r of REGIONS) Object.keys(net[r].bySlug).forEach((s) => slugs.add(s));
  const names = buildNetworkNames(slugs);

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
