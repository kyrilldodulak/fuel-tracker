"use client";

import { FUEL_LABELS, type Fuel, type Region } from "@/lib/types";
import { PERIOD_OPTIONS, type DayRange, type PeriodKey } from "@/lib/period";
import { FUEL_COLOR, REGION_LABELS } from "./constants";

interface Props {
  region: Region;
  onRegion: (r: Region) => void;
  period: PeriodKey;
  onPeriod: (p: PeriodKey) => void;
  range: DayRange;
  bounds: DayRange;
  onCustom: (r: DayRange) => void;
  fuels: Fuel[];
  fuelOptions: Fuel[];
  onToggleFuel: (f: Fuel) => void;
}

export function Filters(p: Props) {
  return (
    <section className="card filters" aria-label="Фільтри">
      <div className="filter-row">
        <div className="seg" role="group" aria-label="Регіон">
          {(Object.keys(REGION_LABELS) as Region[]).map((r) => (
            <button key={r} type="button" aria-pressed={p.region === r} onClick={() => p.onRegion(r)}>
              {REGION_LABELS[r]}
            </button>
          ))}
        </div>
      </div>

      <div className="filter-row">
        <div className="chips" role="group" aria-label="Період">
          {PERIOD_OPTIONS.map((o) => (
            <button key={o.key} type="button" className="chip" aria-pressed={p.period === o.key} onClick={() => p.onPeriod(o.key)}>
              {o.label}
            </button>
          ))}
        </div>
        <div className="daterange">
          <label>
            <span>від</span>
            <input
              type="date"
              value={p.range.from}
              min={p.bounds.from}
              max={p.range.to}
              onChange={(e) => e.target.value && p.onCustom({ from: e.target.value, to: p.range.to })}
            />
          </label>
          <label>
            <span>до</span>
            <input
              type="date"
              value={p.range.to}
              min={p.range.from}
              max={p.bounds.to}
              onChange={(e) => e.target.value && p.onCustom({ from: p.range.from, to: e.target.value })}
            />
          </label>
        </div>
      </div>

      <div className="filter-row">
        <div className="chips" role="group" aria-label="Пальне">
          {p.fuelOptions.map((f) => (
            <button key={f} type="button" className="chip fuel-chip" aria-pressed={p.fuels.includes(f)} onClick={() => p.onToggleFuel(f)}>
              <i className="swatch" style={{ background: FUEL_COLOR[f] }} aria-hidden="true" />
              {FUEL_LABELS[f]}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
