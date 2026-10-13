"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { priceEntries, type DashboardData } from "@/lib/data";
import { defaultComparison, presetRange, type DayRange, type PeriodKey } from "@/lib/period";
import type { Fuel, Region } from "@/lib/types";
import { DEFAULT_FUEL } from "./constants";
import { applyLive } from "@/lib/live";
import { DiscountsCard } from "./Discounts";
import { Filters } from "./Filters";
import { Hero } from "./Hero";
import { applyDiscounts, NetworkComparison } from "./NetworkComparison";
import { PeriodComparison } from "./PeriodComparison";
import { PremiumBrands } from "./PremiumBrands";
import { LiveButton } from "./LiveButton";
import { useDiscounts } from "./useDiscounts";
import { useLive } from "./useLive";

// Recharts is only loaded on the client, in its own chunk.
const PriceCharts = dynamic(() => import("./PriceCharts").then((m) => m.PriceCharts), {
  ssr: false,
  loading: () => <div className="chart-skeleton" />,
});

export function Dashboard({ data, updated, footer }: { data: DashboardData; updated: string; footer: React.ReactNode }) {
  const [region, setRegion] = useState<Region>("ua");
  const [fuel, setFuel] = useState<Fuel>(DEFAULT_FUEL);
  const [period, setPeriod] = useState<PeriodKey>("90");
  const [custom, setCustom] = useState<DayRange>({ from: data.firstDay, to: data.today });
  const [cmp, setCmp] = useState(() => defaultComparison(data.today));
  const [discounts, setDiscount] = useDiscounts();
  const { live, status, refresh } = useLive();

  const bounds: DayRange = { from: data.firstDay, to: data.today };
  const range = period === "custom" ? custom : presetRange(period, data.today, data.firstDay);
  const averages = data.averages[region];
  const networks = data.networks[region];

  const entries = applyLive(priceEntries(networks, data.networkNames, fuel, data.brands), fuel, live);
  const { priced, missing } = applyDiscounts(entries, discounts);
  const best = priced.filter((e) => e.eff === priced[0]?.eff);

  return (
    <>
      <header className="header">
        <h1>Ціни на пальне</h1>
        <p className="muted small">
          {status === "ok" ? null : <>Оновлено {updated} </>}
          <LiveButton status={status} fetchedAt={live?.fetchedAt} onRefresh={refresh} />
        </p>
      </header>
      <Filters region={region} onRegion={setRegion} fuel={fuel} onFuel={setFuel} />
      <Hero fuel={fuel} region={region} best={best} averages={averages} />
      <NetworkComparison priced={priced} missing={missing} isLive={live != null} />
      <DiscountsCard discounts={discounts} onChange={setDiscount} />
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
      <div className="folds">
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
        {footer}
      </div>
    </>
  );
}
