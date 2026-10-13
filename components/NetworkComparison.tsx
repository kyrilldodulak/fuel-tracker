"use client";

import { discountAmount, type Discounts } from "@/lib/discounts";
import type { PriceEntry } from "@/lib/data";

export interface PricedEntry extends PriceEntry {
  price: number;
  /** Effective price after the user's discount. */
  eff: number;
  discount: number;
}

/** Split entries into priced (sorted by effective price) and those without data. */
export function applyDiscounts(entries: PriceEntry[], discounts: Discounts): { priced: PricedEntry[]; missing: PriceEntry[] } {
  const priced: PricedEntry[] = [];
  const missing: PriceEntry[] = [];
  for (const e of entries) {
    if (e.price == null) {
      missing.push(e);
      continue;
    }
    const discount = discountAmount(e.price, discounts[e.slug]);
    priced.push({ ...e, price: e.price, discount, eff: Math.round((e.price - discount) * 100) / 100 });
  }
  priced.sort((a, b) => a.eff - b.eff);
  return { priced, missing };
}

interface Props {
  priced: PricedEntry[];
  missing: PriceEntry[];
  isLive?: boolean;
}

/** Bar length relative to the min..max range so differences stay visible. */
function barWidth(eff: number, min: number, max: number): number {
  return max > min ? 8 + (92 * (eff - min)) / (max - min) : 8;
}

const nf = new Intl.NumberFormat("uk-UA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function NetworkComparison({ priced, missing, isLive }: Props) {
  const min = priced[0]?.eff ?? 0;
  const max = priced.at(-1)?.eff ?? 0;
  return (
    <section className="block" aria-labelledby="nets-h">
      <h2 id="nets-h">Де дешевше</h2>
      {isLive && <p className="muted small">Живі ціни з сайтів мереж</p>}
      {priced.length === 0 ? (
        <p className="empty">Немає даних.</p>
      ) : (
        <ol className="rank">
          {priced.map((e) => (
            <li key={e.slug} className={e.eff === min ? "is-min" : undefined}>
              <span className="rank-name" title={e.brand ? `${e.name}: ${e.brand}` : undefined}>
                {e.name}
              </span>
              <span className="rank-price">
                {e.discount > 0 && <s className="muted small">{nf.format(e.price)}</s>} {nf.format(e.eff)}
              </span>
              <span className="rank-diff muted small">{e.eff === min ? "найдешевше" : `+${nf.format(e.eff - min)} ₴ дорожче`}</span>
              <span className="rank-bar" aria-hidden="true">
                <i style={{ width: `${barWidth(e.eff, min, max)}%` }} />
              </span>
            </li>
          ))}
        </ol>
      )}
      {missing.length > 0 && <p className="muted small">Немає даних: {missing.map((e) => e.name).join(", ")}</p>}
    </section>
  );
}
