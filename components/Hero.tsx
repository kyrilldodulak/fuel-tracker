import { fmtPrice } from "@/lib/format";
import { addDays } from "@/lib/period";
import { valueAtOrBefore, type AverageSeries } from "@/lib/data";
import { FUEL_LABELS, type Fuel } from "@/lib/types";
import { Delta, changeOf } from "./Delta";
import { REGION_LABELS } from "./constants";
import type { PricedEntry } from "./NetworkComparison";
import type { Region } from "@/lib/types";

interface Props {
  fuel: Fuel;
  region: Region;
  best: PricedEntry | undefined;
  averages: AverageSeries;
}

export function Hero({ fuel, region, best, averages }: Props) {
  const col = averages.fuels[fuel];
  const last = averages.dates.at(-1);
  const now = col && last ? valueAtOrBefore(averages.dates, col, last) : null;
  const week = col && last ? changeOf(now, valueAtOrBefore(averages.dates, col, addDays(last, -7))) : null;
  return (
    <section className="card hero" aria-label="Найкращі ціни">
      <p className="hero-best">
        <span className="muted">Найвигідніше для тебе:</span>{" "}
        {best ? (
          <>
            <b>{best.name}</b> <b className="hero-price">{fmtPrice(best.eff)}</b>
            {best.brand && <span className="muted small"> {best.brand}</span>}
          </>
        ) : (
          <span className="muted">немає даних по {FUEL_LABELS[fuel]}</span>
        )}
      </p>
      <div className="kpi-row">
        <div className="kpi-line">
          <span className="kpi-label">Середня, {REGION_LABELS[region]}</span>
          <span className="kpi-value">{now != null ? fmtPrice(now) : "—"}</span>
          <span className="kpi-week">
            {week && <Delta abs={week.abs} pct={null} showPct={false} />} {week?.abs != null && <span className="muted">за тиждень</span>}
          </span>
        </div>
      </div>
    </section>
  );
}
