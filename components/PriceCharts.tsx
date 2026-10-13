"use client";

import { useMemo } from "react";
import type { AverageSeries, NetworkSeries } from "@/lib/data";
import type { DayRange, PeriodKey } from "@/lib/period";
import { FUEL_LABELS, TRACKED_NETWORKS, type Fuel, type Region } from "@/lib/types";
import { FUEL_COLOR, NETWORK_COLOR, REGION_LABELS } from "./constants";
import { PeriodControls } from "./PeriodControls";
import { PriceChart, type ChartLine } from "./PriceChart";

interface Props {
  fuel: Fuel;
  region: Region;
  averages: AverageSeries;
  networks: NetworkSeries;
  period: PeriodKey;
  onPeriod: (p: PeriodKey) => void;
  range: DayRange;
  bounds: DayRange;
  onCustom: (r: DayRange) => void;
}

export function PriceCharts({ fuel, region, averages, networks, period, onPeriod, range, bounds, onCustom }: Props) {
  const avgLines = useMemo<ChartLine[]>(() => {
    const col = averages.fuels[fuel];
    return col ? [{ key: fuel, label: `Середня, ${REGION_LABELS[region]}`, color: FUEL_COLOR[fuel], col }] : [];
  }, [averages, fuel, region]);

  const netLines = useMemo<ChartLine[]>(
    () =>
      TRACKED_NETWORKS.flatMap((n) => {
        const col = networks.bySlug[n.slug]?.[fuel];
        return col ? [{ key: n.slug, label: n.name, color: NETWORK_COLOR[n.slug], col }] : [];
      }),
    [networks, fuel],
  );

  return (
    <section className="card" aria-labelledby="charts-h">
      <h2 id="charts-h">Графіки цін</h2>
      <p className="muted small">
        {FUEL_LABELS[fuel]}, {REGION_LABELS[region]}. Ціни без урахування знижок.
      </p>
      <PeriodControls period={period} onPeriod={onPeriod} range={range} bounds={bounds} onCustom={onCustom} />
      <PriceChart title="Середня ціна по регіону" dates={averages.dates} lines={avgLines} range={range} />
      <PriceChart title="Ціни по мережах" dates={networks.dates} lines={netLines} range={range} />
    </section>
  );
}
