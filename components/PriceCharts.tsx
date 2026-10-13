"use client";

import { useMemo } from "react";
import type { AverageSeries, NetworkSeries } from "@/lib/data";
import type { DayRange, PeriodKey } from "@/lib/period";
import { TRACKED_NETWORKS, type Fuel, type Region } from "@/lib/types";
import { NETWORK_COLOR, REGION_IN } from "./constants";
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
  const lines = useMemo<ChartLine[]>(() => {
    const out: ChartLine[] = TRACKED_NETWORKS.flatMap((n) => {
      const col = networks.bySlug[n.slug]?.[fuel];
      return col ? [{ key: n.slug, label: n.name, color: NETWORK_COLOR[n.slug], dates: networks.dates, col }] : [];
    });
    const avg = averages.fuels[fuel];
    if (avg) out.push({ key: "avg", label: `Середня ${REGION_IN[region]}`, color: "var(--text-2)", dashed: true, dates: averages.dates, col: avg });
    return out;
  }, [averages, networks, fuel, region]);

  return (
    <section className="block" aria-labelledby="charts-h">
      <h2 id="charts-h">Динаміка цін</h2>
      <PeriodControls period={period} onPeriod={onPeriod} range={range} bounds={bounds} onCustom={onCustom} />
      <PriceChart title="Динаміка цін по мережах" lines={lines} range={range} />
    </section>
  );
}
