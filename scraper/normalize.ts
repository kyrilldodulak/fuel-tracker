import type { BrandPrice } from "../lib/types";

const PREMIUM = /mustang|pulls|nano|upg ?100|upg ?95|upg ?diesel|energy|v-?power|\+|преміум|premium|extro/i;

/** Classifies a brand-named product from a network site into base fuel + premium flag. */
export function classify(name: string, price: number): BrandPrice | undefined {
  const s = name.replace(/\s+/g, " ").trim();
  if (/adblue/i.test(s)) return undefined;
  let base: BrandPrice["base"] = "other";
  if (/дп|diesel|дизель|dt\b|^dp$/i.test(s)) base = "diesel";
  else if (/газ|lpg|spbt|спбт/i.test(s)) base = "lpg";
  else if (/100/.test(s)) base = "100";
  else if (/98/.test(s)) base = "98";
  else if (/95/.test(s)) base = "95";
  else if (/92/.test(s)) base = "92";
  const premium = base !== "lpg" && (PREMIUM.test(s) || base === "100" || base === "98");
  return { name: s, base, premium, price };
}

export function classifyAll(items: [name: string, price: number | undefined][]): BrandPrice[] {
  return items.flatMap(([n, p]) => (p ? (classify(n, p) ?? []) : []));
}
