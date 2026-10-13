import type { PriceEntry } from "./data";
import type { BrandPrice, Fuel } from "./types";

/** Response of /api/live: current prices scraped from network websites. */
export interface LiveResponse {
  fetchedAt: string;
  brands: Record<string, BrandPrice[]>;
  errors: Record<string, string>;
}

const LIVE_MAP: Partial<Record<Fuel, { base: BrandPrice["base"]; premium: boolean }>> = {
  a95: { base: "95", premium: false },
  a95p: { base: "95", premium: true },
  dt: { base: "diesel", premium: false },
  dtp: { base: "diesel", premium: true },
  a92: { base: "92", premium: false },
  lpg: { base: "lpg", premium: false },
};

/** Cheapest live item matching `fuel`, or null. */
export function liveItem(items: BrandPrice[] | undefined, fuel: Fuel): BrandPrice | null {
  const m = LIVE_MAP[fuel];
  const list = m ? (items ?? []).filter((b) => b.base === m.base && b.premium === m.premium) : [];
  return list.length ? list.reduce((a, b) => (b.price < a.price ? b : a)) : null;
}

/** Entries with prices replaced by live ones for networks/fuels the live call returned. */
export function applyLive(entries: PriceEntry[], fuel: Fuel, live: LiveResponse | null): PriceEntry[] {
  if (!live) return entries;
  return entries.map((e) => {
    const item = liveItem(live.brands[e.slug], fuel);
    if (!item) return e;
    return { ...e, price: item.price, brand: LIVE_MAP[fuel]?.premium ? item.name : undefined };
  });
}
