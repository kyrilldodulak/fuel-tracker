"use client";

import { FUEL_LABELS, type Fuel, type Region } from "@/lib/types";
import { FUEL_ORDER, REGION_LABELS } from "./constants";

interface Props {
  region: Region;
  onRegion: (r: Region) => void;
  fuel: Fuel;
  onFuel: (f: Fuel) => void;
}

export function Filters({ region, onRegion, fuel, onFuel }: Props) {
  return (
    <div className="controls">
      <div className="seg" role="radiogroup" aria-label="Пальне">
        {FUEL_ORDER.map((f) => (
          <button key={f} type="button" role="radio" aria-checked={fuel === f} onClick={() => onFuel(f)}>
            {FUEL_LABELS[f]}
          </button>
        ))}
      </div>
      <label className="region">
        <span className="visually-hidden">Регіон</span>
        <select value={region} onChange={(e) => onRegion(e.target.value as Region)}>
          {(Object.keys(REGION_LABELS) as Region[]).map((r) => (
            <option key={r} value={r}>
              {REGION_LABELS[r]}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
