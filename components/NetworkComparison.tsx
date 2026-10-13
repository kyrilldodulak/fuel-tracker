"use client";

import { fmtDate, fmtPrice } from "@/lib/format";
import { discountAmount, type Discounts } from "@/lib/discounts";
import type { PriceEntry } from "@/lib/data";
import { FUEL_LABELS, type Fuel, type Region } from "@/lib/types";
import { REGION_LABELS } from "./constants";

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
  fuel: Fuel;
  region: Region;
  day: string | undefined;
  priced: PricedEntry[];
  missing: PriceEntry[];
  all: boolean;
  onAll: (v: boolean) => void;
}

/** Bar length relative to the min..max range so differences stay visible. */
function barWidth(eff: number, min: number, max: number): number {
  return max > min ? 12 + (88 * (eff - min)) / (max - min) : 12;
}

export function NetworkComparison({ fuel, region, day, priced, missing, all, onAll }: Props) {
  const min = priced[0]?.eff ?? 0;
  const max = priced.at(-1)?.eff ?? 0;
  return (
    <section className="card" aria-labelledby="nets-h">
      <div className="card-head">
        <h2 id="nets-h">Де дешевше зараз</h2>
        <label className="check">
          <input type="checkbox" checked={all} onChange={(e) => onAll(e.target.checked)} />
          усі мережі
        </label>
      </div>
      <p className="muted small">
        {FUEL_LABELS[fuel]}, {REGION_LABELS[region]}
        {day ? `, станом на ${fmtDate(day)}` : ""}. Довжина смуги — відносно найдешевшої.
      </p>
      {priced.length === 0 ? (
        <p className="empty">Немає даних.</p>
      ) : (
        <ol className="bars">
          {priced.map((e) => (
            <li key={e.slug} className={e.eff === min ? "is-min" : undefined}>
              <span className="bar-name" title={e.brand ? `${e.name}: ${e.brand}` : undefined}>
                {e.name}
              </span>
              <span className="bar-track" aria-hidden="true">
                <span className="bar-fill" style={{ width: `${barWidth(e.eff, min, max)}%` }} />
              </span>
              <span className="bar-price">
                <b>{fmtPrice(e.eff)}</b>
                {e.discount > 0 && (
                  <span className="bar-orig muted">
                    <s>{fmtPrice(e.price)}</s> −{fmtPrice(e.discount)} знижка
                  </span>
                )}
              </span>
              <span className="bar-diff muted">{e.eff === min ? "найдешевше" : `+${fmtPrice(e.eff - min)} від найдешевшої`}</span>
            </li>
          ))}
        </ol>
      )}
      {missing.length > 0 && (
        <ul className="bars-missing muted">
          {missing.map((e) => (
            <li key={e.slug}>
              <span>{e.name}</span>
              <span>немає даних</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
