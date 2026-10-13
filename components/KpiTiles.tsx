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

const LAGS = [
  { days: 1, label: "за 1 день" },
  { days: 7, label: "за 7 днів" },
  { days: 30, label: "за 30 днів" },
];

export function KpiTiles({ series, fuels }: Props) {
  const last = series.dates.at(-1);
  if (!last) return null;
  return (
    <section className="kpis" aria-label="Поточні ціни">
      {fuels.map((f) => {
        const col = series.fuels[f];
        if (!col) return null;
        const now = valueAtOrBefore(series.dates, col, last);
        return (
          <article key={f} className="card kpi">
            <h3>
              <i className="swatch" style={{ background: FUEL_COLOR[f] }} aria-hidden="true" />
              {FUEL_LABELS[f]}
            </h3>
            <p className="kpi-value">{now != null ? fmtPrice(now) : "—"}</p>
            <ul className="kpi-deltas">
              {LAGS.map((l) => {
                const then = valueAtOrBefore(series.dates, col, addDays(last, -l.days));
                const c = changeOf(now, then);
                return (
                  <li key={l.days}>
                    <span className="muted">{l.label}</span>
                    <Delta abs={c.abs} pct={c.pct} />
                  </li>
                );
              })}
            </ul>
          </article>
        );
      })}
    </section>
  );
}
