import type { Fuel, Region } from "@/lib/types";

/** Display order of fuels. */
export const FUEL_ORDER: Fuel[] = ["dtp", "dt", "a95p", "a95", "a92", "lpg"];
export const DEFAULT_FUEL: Fuel = "dtp";

/** Fixed colour per entity (CSS variables defined in globals.css). */
export const FUEL_COLOR: Record<Fuel, string> = {
  a95: "var(--c1)",
  a95p: "var(--c2)",
  dt: "var(--c3)",
  a92: "var(--c4)",
  lpg: "var(--c5)",
  dtp: "var(--c6)",
};

export const NETWORK_COLOR: Record<string, string> = {
  okko: "var(--c1)",
  wog: "var(--c2)",
  socar: "var(--c3)",
  upg: "var(--c4)",
  ukrnafta: "var(--c6)",
};

export const REGION_LABELS: Record<Region, string> = {
  ua: "Україна",
  kyiv: "Київська обл.",
};

export const REGION_IN: Record<Region, string> = {
  ua: "по Україні",
  kyiv: "по Київській обл.",
};

export const BASE_LABELS: Record<string, string> = {
  "92": "А-92",
  "95": "А-95",
  "98": "А-98",
  "100": "А-100",
  diesel: "ДП",
  lpg: "Газ",
  other: "Інше",
};
