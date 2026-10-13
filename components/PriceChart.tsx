"use client";

import { useMemo } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipContentProps } from "recharts";
import { fmtDate, fmtPrice } from "@/lib/format";
import { addDays, inRange, type DayRange } from "@/lib/period";
import type { Column } from "@/lib/data";

export interface ChartLine {
  key: string;
  label: string;
  color: string;
  dashed?: boolean;
  dates: string[];
  col: Column;
}

type Row = { t: number } & Record<string, number | null>;

/** Show point markers while a line has few enough points for them not to clutter. */
const DOT_LIMIT = 45;

const toMs = (d: string) => Date.parse(`${d}T00:00:00Z`);
const toDay = (t: number) => new Date(t).toISOString().slice(0, 10);

/** One row per distinct day in range, with each line's value (or null). */
function buildRows(lines: ChartLine[], range: DayRange): Row[] {
  const byDay = new Map<string, Row>();
  for (const l of lines) {
    l.dates.forEach((d, i) => {
      const v = l.col[i];
      if (v == null || !inRange(d, range)) return;
      let row = byDay.get(d);
      if (!row) {
        row = { t: toMs(d) };
        for (const o of lines) row[o.key] = null;
        byDay.set(d, row);
      }
      row[l.key] = v;
    });
  }
  return [...byDay.values()].sort((a, b) => a.t - b.t);
}

function ChartTooltip({ active, payload, label, lines }: TooltipContentProps & { lines: ChartLine[] }) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload as Row;
  return (
    <div className="tooltip">
      <div className="tooltip-title">{fmtDate(toDay(Number(label)))}</div>
      {lines.map((l) => {
        const v = row[l.key];
        return (
          <div key={l.key} className="tooltip-row">
            <i className={l.dashed ? "swatch swatch-dash" : "swatch"} style={{ color: l.color }} aria-hidden="true" />
            <span>{l.label}</span>
            <b>{typeof v === "number" ? fmtPrice(v) : "—"}</b>
          </div>
        );
      })}
    </div>
  );
}

interface Props {
  title: string;
  lines: ChartLine[];
  range: DayRange;
}

export function PriceChart({ title, lines, range }: Props) {
  const rows = useMemo(() => buildRows(lines, range), [lines, range]);
  const counts = lines.map((l) => rows.filter((r) => r[l.key] != null).length);
  const total = Math.max(0, ...counts);
  const values = rows.flatMap((r) => lines.map((l) => r[l.key])).filter((v): v is number => v != null);
  const span = values.length ? Math.max(...values) - Math.min(...values) : 0;
  const decimals = span < 6 ? 1 : 0;
  const short = total < 3;

  let domain: [number, number] = [toMs(range.from), toMs(range.to)];
  if (short && rows.length) {
    const lo = rows[0].t;
    const hi = rows[rows.length - 1].t;
    domain = lo === hi ? [toMs(addDays(toDay(lo), -1)), toMs(addDays(toDay(hi), 1))] : [lo, hi];
  }

  if (total === 0) return <p className="empty">Немає даних для обраних параметрів.</p>;

  return (
    <>
      {short && <p className="muted small">Історія збирається з {fmtDate(toDay(rows[0].t))} — лінії з’являться за кілька днів.</p>}
      <ul className="legend" aria-label="Легенда">
        {lines.map((l) => (
          <li key={l.key}>
            <i className={l.dashed ? "swatch swatch-dash" : "swatch"} style={{ color: l.color }} aria-hidden="true" />
            {l.label}
          </li>
        ))}
      </ul>
      <div className="chart" role="img" aria-label={title}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={rows} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
            <CartesianGrid stroke="var(--grid)" vertical={false} />
            <XAxis
              dataKey="t"
              type="number"
              scale="time"
              domain={domain}
              allowDataOverflow
              tickCount={5}
              tickFormatter={(t: number) => fmtDate(toDay(t))}
              tick={{ fill: "var(--text-2)", fontSize: 11 }}
              stroke="var(--grid)"
              minTickGap={40}
            />
            <YAxis
              domain={[(min: number) => Math.floor(min - 0.5), (max: number) => Math.ceil(max + 0.5)]}
              width={36}
              tickFormatter={(v: number) => v.toFixed(decimals)}
              tick={{ fill: "var(--text-2)", fontSize: 11 }}
              stroke="var(--grid)"
              tickLine={false}
              axisLine={false}
            />
            <Tooltip content={(tp) => <ChartTooltip {...tp} lines={lines} />} cursor={{ stroke: "var(--text-2)", strokeDasharray: "3 3" }} />
            {lines.map((l, i) => (
              <Line
                key={l.key}
                type="monotone"
                dataKey={l.key}
                stroke={l.color}
                strokeWidth={l.dashed ? 1.5 : 2}
                strokeDasharray={l.dashed ? "5 4" : undefined}
                dot={{ r: counts[i] <= DOT_LIMIT ? 3.5 : 0, strokeWidth: 2, stroke: "var(--bg)", fill: l.color }}
                activeDot={{ r: 5, strokeWidth: 2, stroke: "var(--bg)" }}
                connectNulls
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <details className="table-view">
        <summary>Показати таблицею (останні 14 точок)</summary>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Дата</th>
                {lines.map((l) => (
                  <th key={l.key} className="num">
                    {l.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.slice(-14).reverse().map((r) => (
                <tr key={r.t}>
                  <td>{fmtDate(toDay(r.t))}</td>
                  {lines.map((l) => (
                    <td key={l.key} className="num">
                      {r[l.key] != null ? fmtPrice(r[l.key] as number) : "—"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </>
  );
}
