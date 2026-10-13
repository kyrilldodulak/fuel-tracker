const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";

export async function fetchText(url: string, retries = 2): Promise<string> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": UA, "Accept-Language": "uk-UA,uk;q=0.9,ru;q=0.8,en;q=0.7" },
        signal: AbortSignal.timeout(30_000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
      return await res.text();
    } catch (err) {
      lastErr = err;
      if (attempt < retries) await sleep(1500 * (attempt + 1));
    }
  }
  throw lastErr;
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** "93,50" | "93.5" → 93.5; empty/invalid → undefined. */
export function parsePrice(s: string | undefined): number | undefined {
  if (!s) return undefined;
  const n = Number(s.replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) && n > 10 && n < 500 ? n : undefined;
}

/** "13.10.2026" → "2026-10-13". */
export function ruDateToIso(s: string): string {
  const [d, m, y] = s.split(".");
  return `${y}-${m}-${d}`;
}

/** Today's date in Kyiv as YYYY-MM-DD. */
export function kyivToday(): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Kyiv" }).format(new Date());
}
