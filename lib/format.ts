const NBSP = " ";

const priceFmt = new Intl.NumberFormat("uk-UA", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const dateFmt = new Intl.DateTimeFormat("uk-UA", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

const dateTimeFmt = new Intl.DateTimeFormat("uk-UA", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Kyiv",
});

const stripYearSuffix = (s: string) => s.replace(/\s?р\.(?=,|$)/, "");

/** 93.5 -> "93,50 ₴" */
export function fmtPrice(n: number): string {
  return `${priceFmt.format(n)}${NBSP}₴`;
}

/** "2026-10-13" -> "13 жовт. 2026" */
export function fmtDate(day: string): string {
  return stripYearSuffix(dateFmt.format(new Date(`${day}T00:00:00Z`)));
}

/** ISO timestamp -> Kyiv local date and time. */
export function fmtDateTimeKyiv(iso: string): string {
  return stripYearSuffix(dateTimeFmt.format(new Date(iso)));
}

export function sign(n: number): string {
  if (Math.abs(n) < 0.005) return "";
  return n > 0 ? "+" : "−";
}

/** Signed money delta: "+1,20 ₴", "−0,50 ₴". */
export function fmtDelta(n: number): string {
  return `${sign(n)}${fmtPrice(Math.abs(n))}`;
}

/** Signed percent delta: "+1,3%". */
export function fmtPct(n: number): string {
  const abs = Math.abs(n);
  const s = new Intl.NumberFormat("uk-UA", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(abs);
  return `${abs < 0.05 ? "" : n > 0 ? "+" : "−"}${s}%`;
}
