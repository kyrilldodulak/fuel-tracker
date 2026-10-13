import { fmtDateTimeKyiv } from "@/lib/format";
import type { MetaFile } from "@/lib/types";

const GROUPS: { prefix: string; label: string }[] = [
  { prefix: "minfin:", label: "Minfin (поточні ціни)" },
  { prefix: "site:", label: "Сайти мереж" },
  { prefix: "backfill:", label: "Історія (одноразове завантаження)" },
];

export function Footer({ meta }: { meta: MetaFile }) {
  const entries = Object.entries(meta.sources).sort(([a], [b]) => a.localeCompare(b));
  return (
    <footer className="footer">
      <h2>Джерела</h2>
      <ul className="small">
        <li>
          <a href="https://index.minfin.com.ua/markets/fuel/" rel="noopener noreferrer">
            index.minfin.com.ua
          </a>{" "}
          — дані Консалтингової групи А-95;
        </li>
        <li>офіційні сайти мереж (WOG, ОККО, SOCAR, UPG тощо) — преміум-лінійки.</li>
      </ul>
      <p className="muted small">Ціни на АЗС однієї мережі можуть відрізнятися залежно від станції та регіону.</p>

      <details className="status">
        <summary>Статус джерел (оновлено {fmtDateTimeKyiv(meta.lastUpdated)})</summary>
        {GROUPS.map((g) => {
          const items = entries.filter(([k]) => k.startsWith(g.prefix));
          return items.length ? (
            <div key={g.prefix}>
              <h3>{g.label}</h3>
              <ul className="status-list">
                {items.map(([k, s]) => (
                  <li key={k} className={s.ok ? "ok" : "fail"} title={s.error ?? fmtDateTimeKyiv(s.at)}>
                    <span aria-hidden="true">{s.ok ? "✓" : "✕"}</span> {k.slice(g.prefix.length)}{" "}
                    <span className="status-word">{s.ok ? "ok" : "fail"}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null;
        })}
      </details>
    </footer>
  );
}
