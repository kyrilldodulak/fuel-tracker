import { fmtDate, fmtPrice } from "@/lib/format";
import { cheapestPremium, type NetworkBrands } from "@/lib/data";
import type { BrandPrice } from "@/lib/types";
import { Fold } from "./Fold";

interface Props {
  day: string | null;
  brands: NetworkBrands[];
}

type Base = BrandPrice["base"];

const COLUMNS: { base: Base; premium: boolean; label: string }[] = [
  { base: "95", premium: false, label: "А-95" },
  { base: "95", premium: true, label: "А-95 преміум" },
  { base: "diesel", premium: false, label: "ДП" },
  { base: "diesel", premium: true, label: "ДП преміум" },
];

/** "95 Mustang Євро5-Е10" -> "Mustang", "ДП Mustang+" -> "Mustang+", "NANO ДП" -> "Nano ДП". */
export function shortBrandName(name: string): string {
  const s = name
    .replace(/\s*Євро\s?\d*[-–]?Е?\d*\s*$/i, "")
    .replace(/^(ДП|Бензин|DIESEL|\d{2,3})\s+(?=\S)/i, "")
    .replace(/\bNANO\b/, "Nano")
    .trim();
  return s || name;
}

/** "100 Mustang Євро5-Е0" → "Mustang 100"; "UPG 100" (network UPG) → "100". */
function hundredLabel(name: string, network: string): string {
  const brand = shortBrandName(name).replace(/\b100\b/, "").replace(new RegExp(`^${network}\\b`, "i"), "").trim();
  return brand ? `${brand} 100` : "100";
}

const nf = new Intl.NumberFormat("uk-UA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function regularOf(items: BrandPrice[], base: Base): number | null {
  const r = items.filter((i) => !i.premium && i.base === base);
  return r.length ? Math.min(...r.map((i) => i.price)) : null;
}

interface Cell {
  price: number;
  brand?: BrandPrice;
  markup?: number;
}

function cellOf(items: BrandPrice[], base: Base, premium: boolean): Cell | null {
  if (!premium) {
    const price = regularOf(items, base);
    return price == null ? null : { price };
  }
  const brand = cheapestPremium(items, base);
  if (!brand) return null;
  const reg = regularOf(items, base);
  return { price: brand.price, brand, markup: reg == null ? undefined : brand.price - reg };
}

export function PremiumBrands({ day, brands }: Props) {
  const rows = brands.map((n) => ({
    n,
    cells: COLUMNS.map((c) => cellOf(n.items, c.base, c.premium)),
  }));
  const mins = COLUMNS.map((_, ci) => {
    const ps = rows.map((r) => r.cells[ci]?.price).filter((p): p is number => p != null);
    return ps.length > 1 ? Math.min(...ps) : null;
  });
  const hundreds = brands
    .map((n) => ({ n, item: cheapestPremium(n.items, "100") }))
    .filter((x): x is { n: NetworkBrands; item: BrandPrice } => x.item != null);

  return (
    <Fold title="Преміум-лінійки мереж">
      <p className="muted small">
        Ціни з сайтів мереж{day ? ` на ${fmtDate(day)}` : ""}. Під ціною — бренд і націнка до звичайного.
      </p>
      <div className="table-wrap prem-wrap">
        <table className="prem-table">
          <thead>
            <tr>
              <th scope="col">Мережа</th>
              {COLUMNS.map((c) => (
                <th key={c.label} scope="col" className="num">
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(({ n, cells }) => (
              <tr key={n.slug}>
                <th scope="row">{n.name}</th>
                {cells.map((c, ci) => (
                  <td key={ci} className="num">
                    {c ? (
                      <>
                        <span className={c.price === mins[ci] ? "prem-min" : undefined}>{nf.format(c.price)}</span>
                        {c.brand && (
                          <span className="prem-sub muted" title={c.brand.name}>
                            {shortBrandName(c.brand.name)}
                            {c.markup != null && ` +${nf.format(Math.max(c.markup, 0))}`}
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {hundreds.length > 0 && (
        <details className="table-view">
          <summary>100-й бензин</summary>
          <ul className="prem-100">
            {hundreds.map(({ n, item }) => (
              <li key={n.slug}>
                <span>
                  {n.name} <span className="muted" title={item.name}>{hundredLabel(item.name, n.name)}</span>
                </span>
                <b>{fmtPrice(item.price)}</b>
              </li>
            ))}
          </ul>
        </details>
      )}
    </Fold>
  );
}
