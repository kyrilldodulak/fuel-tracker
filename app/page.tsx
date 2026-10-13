import { Dashboard } from "@/components/Dashboard";
import { Footer } from "@/components/Footer";
import { fmtDateTimeKyiv } from "@/lib/format";
import { loadDashboardData, meta } from "@/lib/data";

export default function Home() {
  const data = loadDashboardData();
  return (
    <main className="page">
      <header className="header">
        <h1>Ціни на пальне</h1>
        <p className="muted">Оновлено: {fmtDateTimeKyiv(meta.lastUpdated)} (за київським часом)</p>
      </header>
      <Dashboard data={data} />
      <Footer meta={meta} />
    </main>
  );
}
