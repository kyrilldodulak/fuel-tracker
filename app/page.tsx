import { Dashboard } from "@/components/Dashboard";
import { Footer } from "@/components/Footer";
import { fmtDateTimeKyiv } from "@/lib/format";
import { loadDashboardData, meta } from "@/lib/data";

export default function Home() {
  const data = loadDashboardData();
  return (
    <main className="page">
      <Dashboard data={data} updated={fmtDateTimeKyiv(meta.lastUpdated)} footer={<Footer meta={meta} />} />
    </main>
  );
}
