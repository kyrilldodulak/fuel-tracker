"use client";

import { useState } from "react";
import { fmtDate, fmtDelta, fmtPrice } from "@/lib/format";
import { cheapestPremium, networkLabel, type NetworkBrands, type NetworkSeries } from "@/lib/data";
import { FUEL_LABELS, TRACKED_NETWORKS, type Fuel, type Region } from "@/lib/types";
import { FUEL_COLOR, REGION_LABELS } from "./constants";

interface Props {
  region: Region;
  series: NetworkSeries;
  names: Record<string, string>;
  fuels: Fuel[];
  brands: NetworkBrands[];
}

interface Entry {
  slug: string;
  name: string;
  price: number;
  /** Brand product name for premium fuels, e.g. "Mustang+". */
  brand?: string;
}

const PREMIUM_BASE = { dtp: "diesel", a95p: "95" } as const;

function entriesFor(series: NetworkSeries, names: Record<string, string>, fuel: Fuel, all: boolean, brands: NetworkBrands[]): Entry[] {
  const i = series.dates.length - 1;
  const slugs = all ? Object.keys(series.bySlug) : TRACKED_NETWORKS.map((n) => n.slug);
  return slugs
    .flatMap((slug) => {
      const price = series.bySlug[slug]?.[fuel]?.[i];
      if (price == null) return [];
      const base = fuel === "dtp" || fuel === "a95p" ? PREMIUM_BASE[fuel] : null;
      const item = base ? cheapestPremium(brands.find((b) => b.slug === slug)?.items, base) : null;
      return [{ slug, name: networkLabel(slug, names), price, brand: item?.price === price ? item.name : undefined }];
    })
    .sort((a, b) => a.price - b.price);
}

function FuelBars({ fuel, entries }: { fuel: Fuel; entries: Entry[] }) {
  const min = entries[0]?.price;
  const max = entries.at(-1)?.price ?? 0;
  return (
    <div className="bars-block">
      <h3>
        <i className="swatch" style={{ background: FUEL_COLOR[fuel] }} aria-hidden="true" />
        {FUEL_LABELS[fuel]}
      </h3>
      {entries.length === 0 ? (
        <p className="empty">Немає даних.</p>
      ) : (
        <ol className="bars">
          {entries.map((e) => (
            <li key={e.slug} className={e.price === min ? "is-min" : undefined}>
              <span className="bar-name" title={e.brand ? `${e.name}: ${e.brand}` : undefined}>
                {e.name}
              </span>
              <span className="bar-track" aria-hidden="true">
                <span className="bar-fill" style={{ width: `${(e.price / max) * 100}%` }} />
              </span>
              <b className="bar-price">{fmtPrice(e.price)}</b>
              <span className="bar-diff muted">{e.price === min ? "найдешевше" : fmtDelta(e.price - (min ?? e.price))}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

export function NetworkComparison({ region, series, names, fuels, brands }: Props) {
  const [all, setAll] = useState(false);
  const day = series.dates.at(-1);
  return (
    <section className="card" aria-labelledby="nets-h">
      <div className="card-head">
        <h2 id="nets-h">Де дешевше зараз</h2>
        <label className="check">
          <input type="checkbox" checked={all} onChange={(e) => setAll(e.target.checked)} />
          усі мережі
        </label>
      </div>
      <p className="muted small">
        {REGION_LABELS[region]}
        {day ? `, станом на ${fmtDate(day)}` : ""}. Від найдешевшої мережі.
      </p>
      {day ? (
        <div className="bars-grid">
          {fuels.map((f) => (
            <FuelBars key={f} fuel={f} entries={entriesFor(series, names, f, all, brands)} />
          ))}
        </div>
      ) : (
        <p className="empty">Немає даних по мережах.</p>
      )}
    </section>
  );
}
