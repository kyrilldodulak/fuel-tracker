"use client";

import { useMemo, useState } from "react";
import type { DashboardData } from "@/lib/data";
import { defaultComparison, inRange, presetRange, type DayRange, type PeriodKey } from "@/lib/period";
import type { Fuel, Region } from "@/lib/types";
import { DEFAULT_FUELS, FUEL_ORDER } from "./constants";
import { Filters } from "./Filters";
import { KpiTiles } from "./KpiTiles";
import { NetworkComparison } from "./NetworkComparison";
import { PeriodComparison } from "./PeriodComparison";
import { PremiumBrands } from "./PremiumBrands";
import { TrendChart, type ChartMode } from "./TrendChart";

export function Dashboard({ data }: { data: DashboardData }) {
  const [region, setRegion] = useState<Region>("ua");
  const [period, setPeriod] = useState<PeriodKey>("90");
  const [custom, setCustom] = useState<DayRange>({ from: data.firstDay, to: data.today });
  const [picked, setPicked] = useState<Fuel[]>(DEFAULT_FUELS);
  const [mode, setMode] = useState<ChartMode>("fuels");
  const [netFuelState, setNetFuel] = useState<Fuel>("a95");
  const [cmp, setCmp] = useState(() => defaultComparison(data.today));

  const bounds: DayRange = { from: data.firstDay, to: data.today };
  const range = period === "custom" ? custom : presetRange(period, data.today, data.firstDay);
  const averages = data.averages[region];
  const networks = data.networks[region];

  // Hide fuels (e.g. ДП преміум) with no data in the selected range.
  const fuelOptions = useMemo(
    () =>
      FUEL_ORDER.filter((f) => {
        const col = averages.fuels[f];
        return col?.some((v, i) => v != null && inRange(averages.dates[i], range));
      }),
    [averages, range],
  );
  const fuels = FUEL_ORDER.filter((f) => picked.includes(f) && fuelOptions.includes(f));
  const netFuel = fuels.includes(netFuelState) ? netFuelState : (fuels[0] ?? "a95");

  const toggleFuel = (f: Fuel) => setPicked((cur) => (cur.includes(f) ? cur.filter((x) => x !== f) : [...cur, f]));

  return (
    <>
      <Filters
        region={region}
        onRegion={setRegion}
        period={period}
        onPeriod={setPeriod}
        range={range}
        bounds={bounds}
        onCustom={(r) => {
          setCustom(r);
          setPeriod("custom");
        }}
        fuels={fuels}
        fuelOptions={fuelOptions}
        onToggleFuel={toggleFuel}
      />
      <KpiTiles series={averages} fuels={fuels} />
      <TrendChart
        region={region}
        range={range}
        averages={averages}
        networks={networks}
        fuels={fuels}
        mode={mode}
        onMode={setMode}
        netFuel={netFuel}
        onNetFuel={setNetFuel}
      />
      <NetworkComparison region={region} series={networks} names={data.networkNames} fuels={fuels} />
      <PremiumBrands day={data.brandsDay} brands={data.brands} />
      <PeriodComparison
        region={region}
        averages={averages}
        networks={networks}
        names={data.networkNames}
        fuels={fuels}
        a={cmp.a}
        b={cmp.b}
        onA={(a) => setCmp((c) => ({ ...c, a }))}
        onB={(b) => setCmp((c) => ({ ...c, b }))}
      />
    </>
  );
}
