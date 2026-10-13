"use client";

import { useState } from "react";
import { fmtDate, fmtDelta, fmtPrice } from "@/lib/format";
import { networkLabel, type NetworkSeries } from "@/lib/data";
import { FUEL_LABELS, TRACKED_NETWORKS, type Fuel, type Region } from "@/lib/types";
import { FUEL_COLOR, REGION_LABELS } from "./constants";

interface Props {
  region: Region;
  series: NetworkSeries;
  names: Record<string, string>;
  fuels: Fuel[];
}

interface Entry {
  slug: string;
  name: string;
  price: number;
}

function entriesFor(series: NetworkSeries, names: Record<string, string>, fuel: Fuel, all: boolean): Entry[] {
  const i = series.dates.length - 1;
  const slugs = all ? Object.keys(series.bySlug) : TRACKED_NETWORKS.map((n) => n.slug);
  return slugs
    .flatMap((slug) => {
      const price = series.bySlug[slug]?.[fuel]?.[i];
      return price != null ? [{ slug, name: networkLabel(slug, names), price }] : [];
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
              <span className="bar-name">{e.name}</span>
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

export function NetworkComparison({ region, series, names, fuels }: Props) {
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
            <FuelBars key={f} fuel={f} entries={entriesFor(series, names, f, all)} />
          ))}
        </div>
      ) : (
        <p className="empty">Немає даних по мережах.</p>
      )}
    </section>
  );
}
