import { fmtPrice } from "@/lib/format";
import { addDays } from "@/lib/period";
import { valueAtOrBefore, type AverageSeries } from "@/lib/data";
import { FUEL_LABELS, type Fuel } from "@/lib/types";
import { Delta, changeOf } from "./Delta";
import { FUEL_COLOR } from "./constants";

interface Props {
  series: AverageSeries;
  fuels: Fuel[];
}

export function KpiTiles({ series, fuels }: Props) {
  const last = series.dates.at(-1);
  if (!last) return null;
  return (
    <section className="kpis" aria-label="Поточні ціни">
      {fuels.map((f) => {
        const col = series.fuels[f];
        if (!col) return null;
        const now = valueAtOrBefore(series.dates, col, last);
        const chg = (days: number) => changeOf(now, valueAtOrBefore(series.dates, col, addDays(last, -days)));
        const day = chg(1);
        const week = chg(7);
        const month = chg(30);
        return (
          <details key={f} className="kpi-row">
            <summary>
              <span className="kpi-label">
                <i className="swatch" style={{ background: FUEL_COLOR[f] }} aria-hidden="true" />
                {FUEL_LABELS[f]}
              </span>
              <span className="kpi-value">{now != null ? fmtPrice(now) : "—"}</span>
              <span className="kpi-week">
                <Delta abs={week.abs} pct={null} showPct={false} /> {week.abs != null && <span className="muted">за тиждень</span>}
              </span>
            </summary>
            <p className="kpi-more muted">
              за день: <Delta abs={day.abs} pct={day.pct} /> · за місяць: <Delta abs={month.abs} pct={month.pct} />
            </p>
          </details>
        );
      })}
    </section>
  );
}
