"use client";

import { DISCOUNT_NETWORKS, parseAmount, type Discount, type DiscountUnit, type Discounts } from "@/lib/discounts";
import { Fold } from "./Fold";
import { discountOf } from "./useDiscounts";

interface Props {
  discounts: Discounts;
  onChange: (slug: string, d: Discount) => void;
}

const UNITS: { key: DiscountUnit; label: string }[] = [
  { key: "uah", label: "₴/л" },
  { key: "pct", label: "%" },
];

/** "ОККО −2 ₴, WOG −3%" for the networks with a discount set. */
function summarize(discounts: Discounts): string {
  return DISCOUNT_NETWORKS.flatMap((n) => {
    const d = discountOf(discounts, n.slug);
    const amount = parseAmount(d.value);
    return amount > 0 ? [`${n.name} −${amount.toLocaleString("uk-UA")}${d.unit === "pct" ? "%" : " ₴"}`] : [];
  }).join(", ");
}

export function DiscountsCard({ discounts, onChange }: Props) {
  return (
    <Fold title="Мої знижки" hint={summarize(discounts)}>
      <div className="disc-grid">
        {DISCOUNT_NETWORKS.map((n) => {
          const d = discountOf(discounts, n.slug);
          return (
            <div key={n.slug} className="disc">
              <label htmlFor={`disc-${n.slug}`}>{n.name}</label>
              <div className="disc-input">
                <input
                  id={`disc-${n.slug}`}
                  type="text"
                  inputMode="decimal"
                  placeholder="0"
                  value={d.value}
                  onChange={(e) => onChange(n.slug, { ...d, value: e.target.value })}
                />
                <div className="seg seg-sm" role="group" aria-label={`Одиниця знижки ${n.name}`}>
                  {UNITS.map((u) => (
                    <button key={u.key} type="button" aria-pressed={d.unit === u.key} onClick={() => onChange(n.slug, { ...d, unit: u.key })}>
                      {u.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <p className="muted small">Знижка застосовується до цін цієї мережі в порівнянні нижче.</p>
    </Fold>
  );
}
