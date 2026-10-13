"use client";

import { fmtDate, fmtPrice } from "@/lib/format";
import { inRange, mean, type DayRange } from "@/lib/period";
import { networkLabel, type AverageSeries, type Column, type NetworkSeries } from "@/lib/data";
import { FUEL_LABELS, TRACKED_NETWORKS, type Fuel, type Region } from "@/lib/types";
import { Delta, changeOf } from "./Delta";
import { REGION_LABELS } from "./constants";

interface Props {
  region: Region;
  averages: AverageSeries;
  networks: NetworkSeries;
  names: Record<string, string>;
  fuel: Fuel;
  a: DayRange;
  b: DayRange;
  onA: (r: DayRange) => void;
  onB: (r: DayRange) => void;
}

function avgOver(dates: string[], col: Column | undefined, r: DayRange): number | null {
  if (!col) return null;
  return mean(col.filter((_, i) => inRange(dates[i], r)));
}

function RangeInputs({ label, r, onChange }: { label: string; r: DayRange; onChange: (r: DayRange) => void }) {
  return (
    <fieldset className="range-pick">
      <legend>{label}</legend>
      <input type="date" aria-label={`${label}: від`} value={r.from} max={r.to} onChange={(e) => e.target.value && onChange({ ...r, from: e.target.value })} />
      <span aria-hidden="true">—</span>
      <input type="date" aria-label={`${label}: до`} value={r.to} min={r.from} onChange={(e) => e.target.value && onChange({ ...r, to: e.target.value })} />
    </fieldset>
  );
}

interface RowData {
  key: string;
  label: string;
  a: number | null;
  b: number | null;
}

function CompareTable({ rows, first, aLabel, bLabel }: { rows: RowData[]; first: string; aLabel: string; bLabel: string }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>{first}</th>
            <th className="num">{aLabel}</th>
            <th className="num">{bLabel}</th>
            <th className="num">Зміна A відносно B</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const c = changeOf(r.a, r.b);
            return (
              <tr key={r.key}>
                <td>{r.label}</td>
                <td className="num">{r.a != null ? fmtPrice(r.a) : "—"}</td>
                <td className="num">{r.b != null ? fmtPrice(r.b) : "—"}</td>
                <td className="num">
                  <Delta abs={c.abs} pct={c.pct} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function PeriodComparison({ region, averages, networks, names, fuel, a, b, onA, onB }: Props) {
  const rows: RowData[] = [
    {
      key: "avg",
      label: `Середнє, ${REGION_LABELS[region]}`,
      a: avgOver(averages.dates, averages.fuels[fuel], a),
      b: avgOver(averages.dates, averages.fuels[fuel], b),
    },
    ...TRACKED_NETWORKS.map((n) => ({
      key: n.slug,
      label: networkLabel(n.slug, names),
      a: avgOver(networks.dates, networks.bySlug[n.slug]?.[fuel], a),
      b: avgOver(networks.dates, networks.bySlug[n.slug]?.[fuel], b),
    })),
  ];
  const aLabel = `A: ${fmtDate(a.from)} – ${fmtDate(a.to)}`;
  const bLabel = `B: ${fmtDate(b.from)} – ${fmtDate(b.to)}`;
  const netStart = networks.dates[0];

  return (
    <details className="card fold" aria-label="Порівняння періодів">
      <summary>
        <h2>Порівняння періодів</h2>
      </summary>
      <p className="muted small">
        {FUEL_LABELS[fuel]}, середні ціни за період. {REGION_LABELS[region]}. Типово — останні 30 днів проти попередніх 30.
      </p>
      <div className="range-row">
        <RangeInputs label="Період A" r={a} onChange={onA} />
        <RangeInputs label="Період B" r={b} onChange={onB} />
      </div>
      {netStart && (a.from < netStart || b.from < netStart) && (
        <p className="note">Історія по мережах є лише з {fmtDate(netStart)}; для раніших періодів — «—».</p>
      )}
      <CompareTable rows={rows} first="Мережа" aLabel={aLabel} bLabel={bLabel} />
    </details>
  );
}
