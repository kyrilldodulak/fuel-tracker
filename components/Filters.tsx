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
    <section className="card filters" aria-label="Регіон і пальне">
      <div className="seg" role="group" aria-label="Регіон">
        {(Object.keys(REGION_LABELS) as Region[]).map((r) => (
          <button key={r} type="button" aria-pressed={region === r} onClick={() => onRegion(r)}>
            {REGION_LABELS[r]}
          </button>
        ))}
      </div>
      <div className="chips" role="radiogroup" aria-label="Пальне">
        {FUEL_ORDER.map((f) => (
          <button key={f} type="button" role="radio" aria-checked={fuel === f} className="chip" onClick={() => onFuel(f)}>
            {FUEL_LABELS[f]}
          </button>
        ))}
      </div>
    </section>
  );
}
