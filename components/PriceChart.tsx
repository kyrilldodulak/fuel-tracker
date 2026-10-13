"use client";

import { useMemo } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipContentProps } from "recharts";
import { fmtDate, fmtPrice } from "@/lib/format";
import { bucketSize, inRange, mean, type DayRange } from "@/lib/period";
import type { Column } from "@/lib/data";

export interface ChartLine {
  key: string;
  label: string;
  color: string;
  col: Column;
}

type Row = Record<string, number | string | null>;

/** Show point markers while a line has few enough points for them not to clutter. */
const DOT_LIMIT = 45;

function buildRows(dates: string[], lines: ChartLine[], range: DayRange): { rows: Row[]; step: number } {
  const idx: number[] = [];
  dates.forEach((d, i) => inRange(d, range) && idx.push(i));
  const step = bucketSize(idx.length);
  const rows: Row[] = [];
  for (let s = 0; s < idx.length; s += step) {
    const chunk = idx.slice(s, s + step);
    const row: Row = { date: dates[chunk[0]] };
    for (const l of lines) row[l.key] = mean(chunk.map((i) => l.col[i]));
    rows.push(row);
  }
  return { rows, step };
}

function ChartTooltip({ active, payload, label, lines, step }: TooltipContentProps & { lines: ChartLine[]; step: number }) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload as Row;
  return (
    <div className="tooltip">
      <div className="tooltip-title">
        {fmtDate(String(label))}
        {step > 1 ? " (сер. за період)" : ""}
      </div>
      {lines.map((l) => {
        const v = row[l.key];
        return (
          <div key={l.key} className="tooltip-row">
            <i className="swatch" style={{ background: l.color }} aria-hidden="true" />
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
  dates: string[];
  lines: ChartLine[];
  range: DayRange;
}

export function PriceChart({ title, dates, lines, range }: Props) {
  const { rows, step } = useMemo(() => buildRows(dates, lines, range), [dates, lines, range]);
  const counts = lines.map((l) => rows.filter((r) => typeof r[l.key] === "number").length);
  const total = Math.max(0, ...counts);
  const values = rows.flatMap((r) => lines.map((l) => r[l.key])).filter((v): v is number => typeof v === "number");
  const span = values.length ? Math.max(...values) - Math.min(...values) : 0;
  const decimals = span < 6 ? 1 : 0;
  const firstDay = rows.find((r) => lines.some((l) => typeof r[l.key] === "number"))?.date;

  return (
    <div className="chart-block">
      <h3>{title}</h3>
      {lines.length === 0 || total === 0 ? (
        <p className="empty">Немає даних для обраних параметрів.</p>
      ) : (
        <>
          {total < 3 && (
            <p className="muted small">Історія збирається з {fmtDate(String(firstDay))} — лінії з’являться за кілька днів.</p>
          )}
          {lines.length > 1 && (
            <ul className="legend" aria-label="Легенда">
              {lines.map((l) => (
                <li key={l.key}>
                  <i className="swatch" style={{ background: l.color }} aria-hidden="true" />
                  {l.label}
                </li>
              ))}
            </ul>
          )}
          <div className="chart" role="img" aria-label={title}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={rows} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
                <CartesianGrid stroke="var(--grid)" vertical={false} />
                <XAxis
                  dataKey="date"
                  tickFormatter={(d: string) => fmtDate(d)}
                  tick={{ fill: "var(--text-2)", fontSize: 11 }}
                  stroke="var(--grid)"
                  minTickGap={48}
                />
                <YAxis
                  domain={[(min: number) => Math.floor(min - 0.5), (max: number) => Math.ceil(max + 0.5)]}
                  width={44}
                  tickFormatter={(v: number) => v.toFixed(decimals)}
                  tick={{ fill: "var(--text-2)", fontSize: 11 }}
                  stroke="var(--grid)"
                  tickLine={false}
                />
                <Tooltip content={(tp) => <ChartTooltip {...tp} lines={lines} step={step} />} cursor={{ stroke: "var(--text-2)", strokeDasharray: "3 3" }} />
                {lines.map((l, i) => (
                  <Line
                    key={l.key}
                    type="monotone"
                    dataKey={l.key}
                    stroke={l.color}
                    strokeWidth={2}
                    dot={{ r: counts[i] <= DOT_LIMIT ? 4 : 0, strokeWidth: 2, stroke: "var(--surface)", fill: l.color }}
                    activeDot={{ r: 5, strokeWidth: 2, stroke: "var(--surface)" }}
                    connectNulls={false}
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
                    <tr key={String(r.date)}>
                      <td>{fmtDate(String(r.date))}</td>
                      {lines.map((l) => (
                        <td key={l.key} className="num">
                          {typeof r[l.key] === "number" ? fmtPrice(r[l.key] as number) : "—"}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </>
      )}
    </div>
  );
}
