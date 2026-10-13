import { fmtDate, fmtPrice } from "@/lib/format";
import type { NetworkBrands } from "@/lib/data";
import type { BrandPrice } from "@/lib/types";
import { Delta, changeOf } from "./Delta";
import { BASE_LABELS } from "./constants";

interface Props {
  day: string | null;
  brands: NetworkBrands[];
}

/** Regular fuel of the same base; premium 98/100 fall back to regular А-95. */
function reference(items: BrandPrice[], b: BrandPrice): { price: number; label: string } | null {
  const regular = items.filter((i) => !i.premium);
  const same = regular.find((i) => i.base === b.base);
  if (same) return { price: same.price, label: BASE_LABELS[b.base] };
  if (b.base === "98" || b.base === "100") {
    const a95 = regular.find((i) => i.base === "95");
    if (a95) return { price: a95.price, label: BASE_LABELS["95"] };
  }
  return null;
}

function BrandRow({ item, items }: { item: BrandPrice; items: BrandPrice[] }) {
  const ref = item.premium ? reference(items, item) : null;
  const c = ref ? changeOf(item.price, ref.price) : null;
  return (
    <li className="brand-row">
      <div className="brand-main">
        <b>{item.name}</b>
        <span className="muted small">{BASE_LABELS[item.base] ?? item.base}</span>
        {item.premium && <span className="badge">преміум</span>}
      </div>
      <div className="brand-price">
        <b>{fmtPrice(item.price)}</b>
        {c && ref && (
          <span className="small">
            <span className="muted">до {ref.label}: </span>
            <Delta abs={c.abs} pct={c.pct} />
          </span>
        )}
      </div>
    </li>
  );
}

export function PremiumBrands({ day, brands }: Props) {
  return (
    <section className="card" aria-labelledby="brands-h">
      <h2 id="brands-h">Преміум-лінійки мереж</h2>
      <p className="muted small">
        Ціни з сайтів мереж{day ? ` на ${fmtDate(day)}` : ""}. Націнка — відносно звичайного пального тієї ж мережі.
      </p>
      <div className="brands-grid">
        {brands.map((n) => (
          <article key={n.slug} className="brand-card">
            <h3>{n.name}</h3>
            <ul>
              {[...n.items]
                .sort((a, b) => Number(b.premium) - Number(a.premium) || a.base.localeCompare(b.base) || a.price - b.price)
                .map((it) => (
                  <BrandRow key={`${it.name}-${it.base}`} item={it} items={n.items} />
                ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}
