"use client";

import { PERIOD_OPTIONS, type DayRange, type PeriodKey } from "@/lib/period";

interface Props {
  period: PeriodKey;
  onPeriod: (p: PeriodKey) => void;
  range: DayRange;
  bounds: DayRange;
  onCustom: (r: DayRange) => void;
}

export function PeriodControls({ period, onPeriod, range, bounds, onCustom }: Props) {
  return (
    <div className="filter-row">
      <div className="chips" role="group" aria-label="Період">
        {PERIOD_OPTIONS.map((o) => (
          <button key={o.key} type="button" className="chip" aria-pressed={period === o.key} onClick={() => onPeriod(o.key)}>
            {o.label}
          </button>
        ))}
      </div>
      <div className="daterange">
        <label>
          <span>від</span>
          <input
            type="date"
            value={range.from}
            min={bounds.from}
            max={range.to}
            onChange={(e) => e.target.value && onCustom({ from: e.target.value, to: range.to })}
          />
        </label>
        <label>
          <span>до</span>
          <input
            type="date"
            value={range.to}
            min={range.from}
            max={bounds.to}
            onChange={(e) => e.target.value && onCustom({ from: range.from, to: e.target.value })}
          />
        </label>
      </div>
    </div>
  );
}
