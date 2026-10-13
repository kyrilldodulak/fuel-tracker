export type DiscountUnit = "uah" | "pct";

export interface Discount {
  /** Raw text of the input (may use a comma). */
  value: string;
  unit: DiscountUnit;
}

export type Discounts = Record<string, Discount>;

export const DISCOUNT_NETWORKS: { slug: string; name: string }[] = [
  { slug: "okko", name: "ОККО" },
  { slug: "wog", name: "WOG" },
  { slug: "ukrnafta", name: "Укрнафта" },
];

export const EMPTY_DISCOUNT: Discount = { value: "", unit: "uah" };

export function parseAmount(value: string): number {
  const n = Number(value.replace(",", ".").trim());
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/** Discount in ₴ for a shelf price (never more than the price). */
export function discountAmount(price: number, d: Discount | undefined): number {
  if (!d) return 0;
  const n = parseAmount(d.value);
  const abs = d.unit === "pct" ? (price * Math.min(n, 100)) / 100 : n;
  return Math.min(price, Math.round(abs * 100) / 100);
}
