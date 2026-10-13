"use client";

import { useState } from "react";
import { priceEntries, type DashboardData } from "@/lib/data";
import { defaultComparison, presetRange, type DayRange, type PeriodKey } from "@/lib/period";
import type { Fuel, Region } from "@/lib/types";
import { DEFAULT_FUEL } from "./constants";
import { DiscountsCard } from "./Discounts";
import { Filters } from "./Filters";
import { Hero } from "./Hero";
import { applyDiscounts, NetworkComparison } from "./NetworkComparison";
import { PeriodComparison } from "./PeriodComparison";
import { PremiumBrands } from "./PremiumBrands";
import { PriceCharts } from "./PriceCharts";
import { useDiscounts } from "./useDiscounts";

export function Dashboard({ data }: { data: DashboardData }) {
  const [region, setRegion] = useState<Region>("ua");
  const [fuel, setFuel] = useState<Fuel>(DEFAULT_FUEL);
  const [period, setPeriod] = useState<PeriodKey>("90");
  const [custom, setCustom] = useState<DayRange>({ from: data.firstDay, to: data.today });
  const [all, setAll] = useState(false);
  const [cmp, setCmp] = useState(() => defaultComparison(data.today));
  const [discounts, setDiscount] = useDiscounts();

  const bounds: DayRange = { from: data.firstDay, to: data.today };
  const range = period === "custom" ? custom : presetRange(period, data.today, data.firstDay);
  const averages = data.averages[region];
  const networks = data.networks[region];

  const entries = priceEntries(networks, data.networkNames, fuel, all, data.brands);
  const { priced, missing } = applyDiscounts(entries, discounts);

  return (
    <>
      <Filters region={region} onRegion={setRegion} fuel={fuel} onFuel={setFuel} />
      <DiscountsCard discounts={discounts} onChange={setDiscount} />
      <Hero fuel={fuel} region={region} best={priced[0]} averages={averages} />
      <NetworkComparison fuel={fuel} region={region} day={networks.dates.at(-1)} priced={priced} missing={missing} all={all} onAll={setAll} />
      <PriceCharts
        fuel={fuel}
        region={region}
        averages={averages}
        networks={networks}
        period={period}
        onPeriod={setPeriod}
        range={range}
        bounds={bounds}
        onCustom={(r) => {
          setCustom(r);
          setPeriod("custom");
        }}
      />
      <PremiumBrands day={data.brandsDay} brands={data.brands} />
      <PeriodComparison
        region={region}
        averages={averages}
        networks={networks}
        names={data.networkNames}
        fuel={fuel}
        a={cmp.a}
        b={cmp.b}
        onA={(a) => setCmp((c) => ({ ...c, a }))}
        onB={(b) => setCmp((c) => ({ ...c, b }))}
      />
    </>
  );
}
