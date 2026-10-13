"use client";

import { useMemo } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipContentProps } from "recharts";
import { fmtDate, fmtPrice } from "@/lib/format";
import { bucketSize, inRange, mean, type DayRange } from "@/lib/period";
import type { AverageSeries, Column, NetworkSeries } from "@/lib/data";
import { FUEL_LABELS, TRACKED_NETWORKS, type Fuel, type Region } from "@/lib/types";
import { FUEL_COLOR, NETWORK_COLOR, REGION_LABELS } from "./constants";

export type ChartMode = "fuels" | "networks";

interface Props {
  region: Region;
  range: DayRange;
  averages: AverageSeries;
  networks: NetworkSeries;
  fuels: Fuel[];
  mode: ChartMode;
  onMode: (m: ChartMode) => void;
  netFuel: Fuel;
  onNetFuel: (f: Fuel) => void;
}

interface ChartLine {
  key: string;
  label: string;
  color: string;
  col: Column;
}

type Row = Record<string, number | string | null>;

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

export function TrendChart({ region, range, averages, networks, fuels, mode, onMode, netFuel, onNetFuel }: Props) {
  const { lines, dates, firstAvail } = useMemo(() => {
    if (mode === "fuels") {
      const ls: ChartLine[] = fuels.flatMap((f) => {
        const col = averages.fuels[f];
        return col ? [{ key: f, label: FUEL_LABELS[f], color: FUEL_COLOR[f], col }] : [];
      });
      return { lines: ls, dates: averages.dates, firstAvail: averages.dates[0] };
    }
    const ls: ChartLine[] = TRACKED_NETWORKS.flatMap((n) => {
      const col = networks.bySlug[n.slug]?.[netFuel];
      return col ? [{ key: n.slug, label: n.name, color: NETWORK_COLOR[n.slug], col }] : [];
    });
    return { lines: ls, dates: networks.dates, firstAvail: networks.dates[0] };
  }, [mode, fuels, averages, networks, netFuel]);

  const { rows, step } = useMemo(() => buildRows(dates, lines, range), [dates, lines, range]);
  const sparse = rows.length <= 3;
  const note =
    firstAvail && range.from < firstAvail
      ? `Для ${mode === "fuels" ? `регіону «${REGION_LABELS[region]}»` : `мереж (${REGION_LABELS[region]})`} дані є лише з ${fmtDate(firstAvail)}${
          dates.length < 2 ? " (одна точка)" : ""
        }.`
      : null;

  const pointCount = rows.filter((r) => lines.some((l) => typeof r[l.key] === "number")).length;
  const collecting = mode === "fuels" && lines.length > 0 && rows.length > 0 && pointCount < 3;
  const collectingFrom = collecting
    ? lines
        .map((l) => dates[l.col.findIndex((v, i) => v != null && inRange(dates[i], range))])
        .filter(Boolean)
        .sort()[0]
    : undefined;

  const dtpCol = mode === "fuels" && fuels.includes("dtp") ? averages.fuels.dtp : undefined;
  const dtpFirst = dtpCol ? averages.dates[dtpCol.findIndex((v) => v != null)] : undefined;
  const dtpNote =
    dtpFirst && range.from < dtpFirst ? `${FUEL_LABELS.dtp}: дані з ${fmtDate(dtpFirst)} — історія накопичується` : null;

  return (
    <section className="card" aria-labelledby="trend-h">
      <div className="card-head">
        <h2 id="trend-h">Динаміка цін</h2>
        <div className="seg seg-sm" role="group" aria-label="Режим графіка">
          <button type="button" aria-pressed={mode === "fuels"} onClick={() => onMode("fuels")}>
            Види пального
          </button>
          <button type="button" aria-pressed={mode === "networks"} onClick={() => onMode("networks")}>
            Мережі
          </button>
        </div>
      </div>

      {mode === "networks" && (
        <label className="inline-select">
          <span className="muted">Пальне:</span>
          <select value={netFuel} onChange={(e) => onNetFuel(e.target.value as Fuel)}>
            {fuels.map((f) => (
              <option key={f} value={f}>
                {FUEL_LABELS[f]}
              </option>
            ))}
          </select>
        </label>
      )}

      {!collecting && note && <p className="note">{note}</p>}
      {!collecting && dtpNote && <p className="muted small">{dtpNote}</p>}

      {collecting ? (
        <p className="empty">
          {lines.map((l) => l.label).join(", ")}: історія збирається{collectingFrom ? ` з ${fmtDate(collectingFrom)}` : ""} — графік з’явиться за
          кілька днів. Поки що оберіть інші види пального або вкладку «Мережі».
        </p>
      ) : lines.length === 0 || rows.length === 0 ? (
        <p className="empty">Немає даних для обраних параметрів.</p>
      ) : (
        <>
          <ul className="legend" aria-label="Легенда">
            {lines.map((l) => (
              <li key={l.key}>
                <i className="swatch" style={{ background: l.color }} aria-hidden="true" />
                {l.label}
              </li>
            ))}
          </ul>
          <div className="chart" role="img" aria-label="Графік цін на пальне">
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
                  domain={["auto", "auto"]}
                  width={44}
                  tickFormatter={(v: number) => v.toFixed(0)}
                  tick={{ fill: "var(--text-2)", fontSize: 11 }}
                  stroke="var(--grid)"
                  tickLine={false}
                  unit=""
                />
                <Tooltip content={(tp) => <ChartTooltip {...tp} lines={lines} step={step} />} cursor={{ stroke: "var(--text-2)", strokeDasharray: "3 3" }} />
                {lines.map((l) => (
                  <Line
                    key={l.key}
                    type="monotone"
                    dataKey={l.key}
                    stroke={l.color}
                    strokeWidth={2}
                    dot={sparse ? { r: 4, strokeWidth: 2, stroke: "var(--surface)" } : false}
                    activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--surface)" }}
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
    </section>
  );
}
