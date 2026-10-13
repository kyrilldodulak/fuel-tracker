// Shared data model for scraper (writes data/*.json) and frontend (reads it at build time).

/** Fuel categories as reported by the minfin aggregator. */
export const FUELS = ["a95p", "a95", "a92", "dt", "dtp", "lpg"] as const;
export type Fuel = (typeof FUELS)[number];
export type FuelPrices = Partial<Record<Fuel, number>>;

/** ISO date (YYYY-MM-DD, Kyiv time). */
export type Day = string;

export type Region = "ua" | "kyiv";

/** averages.json — national (and Kyiv-region) averages by day. */
export type AveragesFile = Record<Region, Record<Day, FuelPrices>>;

/** networks.json — per-network prices by region and day. Keys are minfin slugs (wog, okko…). */
export type NetworksFile = Record<Region, Record<Day, Record<string, FuelPrices>>>;

/** A brand-named product as listed on a network's own website. */
export interface BrandPrice {
  name: string; // as on the site: "Mustang+", "Pulls Diesel", "Nano 95"…
  base: "92" | "95" | "98" | "100" | "diesel" | "lpg" | "other";
  premium: boolean;
  price: number;
}

/** brands.json — network website prices by day. */
export type BrandsFile = Record<Day, Record<string, BrandPrice[]>>;

export interface SourceStatus {
  ok: boolean;
  at: string; // ISO timestamp
  error?: string;
  count?: number;
}

export interface MetaFile {
  lastUpdated: string;
  sources: Record<string, SourceStatus>;
}

export interface NetworkInfo {
  slug: string;
  name: string;
}

/** Networks the dashboard focuses on. */
export const TRACKED_NETWORKS: NetworkInfo[] = [
  { slug: "okko", name: "ОККО" },
  { slug: "wog", name: "WOG" },
  { slug: "socar", name: "SOCAR" },
  { slug: "upg", name: "UPG" },
  { slug: "ukrnafta", name: "Укрнафта" },
];

export const FUEL_LABELS: Record<Fuel, string> = {
  a95p: "А-95 преміум",
  a95: "А-95",
  a92: "А-92",
  dt: "ДП",
  dtp: "ДП преміум",
  lpg: "Газ",
};
