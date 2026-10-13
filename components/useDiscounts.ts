"use client";

import { useCallback, useEffect, useState } from "react";
import { EMPTY_DISCOUNT, type Discount, type Discounts } from "@/lib/discounts";

const KEY = "fuel-tracker:discounts:v1";

function isDiscount(v: unknown): v is Discount {
  if (typeof v !== "object" || v === null) return false;
  const o = v as Record<string, unknown>;
  return typeof o.value === "string" && (o.unit === "uah" || o.unit === "pct");
}

/** Discounts persisted in localStorage; loaded after mount to avoid hydration mismatch. */
export function useDiscounts(): [Discounts, (slug: string, d: Discount) => void] {
  const [discounts, setDiscounts] = useState<Discounts>({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    // Deferred so the first client render matches the server HTML.
    queueMicrotask(() => {
      try {
        const raw: unknown = JSON.parse(localStorage.getItem(KEY) ?? "null");
        if (typeof raw === "object" && raw !== null) {
          const next: Discounts = {};
          for (const [k, v] of Object.entries(raw)) if (isDiscount(v)) next[k] = v;
          setDiscounts(next);
        }
      } catch {
        /* storage unavailable or corrupt: start empty */
      }
      setLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(discounts));
    } catch {
      /* ignore */
    }
  }, [discounts, loaded]);

  const set = useCallback((slug: string, d: Discount) => setDiscounts((cur) => ({ ...cur, [slug]: d })), []);
  return [discounts, set];
}

export function discountOf(discounts: Discounts, slug: string): Discount {
  return discounts[slug] ?? EMPTY_DISCOUNT;
}
