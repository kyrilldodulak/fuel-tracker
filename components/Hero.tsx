import { fmtPrice } from "@/lib/format";
import { addDays } from "@/lib/period";
import { valueAtOrBefore, type AverageSeries } from "@/lib/data";
import { FUEL_LABELS, type Fuel, type Region } from "@/lib/types";
import { Delta, changeOf } from "./Delta";
import { REGION_IN } from "./constants";
import type { PricedEntry } from "./NetworkComparison";

interface Props {
  fuel: Fuel;
  region: Region;
  /** Cheapest entries (ties included), best first. */
  best: PricedEntry[];
  averages: AverageSeries;
}

export function Hero({ fuel, region, best, averages }: Props) {
  const col = averages.fuels[fuel];
  const last = averages.dates.at(-1);
  const now = col && last ? valueAtOrBefore(averages.dates, col, last) : null;
  const week = col && last ? changeOf(now, valueAtOrBefore(averages.dates, col, addDays(last, -7))) : null;
  return (
    <section className="hero" aria-label="Найкраща ціна">
      {best.length ? (
        <p className="hero-best">
          <span className="muted">Найвигідніше:</span> <b>{best.map((b) => b.name).join(", ")}</b> — <b>{fmtPrice(best[0].eff)}</b>
          {best[0].brand && best.length === 1 && <span className="muted small"> {best[0].brand}</span>}
        </p>
      ) : (
        <p className="hero-best muted">Немає даних по {FUEL_LABELS[fuel]}</p>
      )}
      {now != null && (
        <p className="muted small">
          Середня {REGION_IN[region]} {fmtPrice(now)}
          {week?.abs != null && (
            <>
              {" · "}
              {Math.abs(week.abs) < 0.005 ? (
                "без змін за тиждень"
              ) : (
                <>
                  <Delta abs={week.abs} pct={null} showPct={false} /> за тиждень
                </>
              )}
            </>
          )}
        </p>
      )}
    </section>
  );
}
