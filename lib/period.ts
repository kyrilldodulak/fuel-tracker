import type { Day } from "./types";

export type PeriodKey = "7" | "30" | "90" | "365" | "all" | "custom";

export const PERIOD_OPTIONS: { key: PeriodKey; label: string }[] = [
  { key: "7", label: "7д" },
  { key: "30", label: "30д" },
  { key: "90", label: "90д" },
  { key: "365", label: "Рік" },
  { key: "all", label: "Усе" },
];

export interface DayRange {
  from: Day;
  to: Day;
}

const DAY_MS = 86_400_000;

const toMs = (d: Day) => Date.parse(`${d}T00:00:00Z`);

export function addDays(day: Day, n: number): Day {
  return new Date(toMs(day) + n * DAY_MS).toISOString().slice(0, 10);
}

export function diffDays(a: Day, b: Day): number {
  return Math.round((toMs(a) - toMs(b)) / DAY_MS);
}

/** Resolve a preset into a concrete range ending at `end` (the latest data day). */
export function presetRange(key: Exclude<PeriodKey, "custom">, end: Day, first: Day): DayRange {
  if (key === "all") return { from: first, to: end };
  return { from: addDays(end, -Number(key)), to: end };
}

export function inRange(day: Day, r: DayRange): boolean {
  return day >= r.from && day <= r.to;
}

/** Default comparison: last 30 days vs the 30 days before. */
export function defaultComparison(end: Day): { a: DayRange; b: DayRange } {
  const a = { from: addDays(end, -29), to: end };
  const b = { from: addDays(end, -59), to: addDays(end, -30) };
  return { a, b };
}

/** Mean of non-null values, or null if there are none. */
export function mean(values: (number | null | undefined)[]): number | null {
  let sum = 0;
  let n = 0;
  for (const v of values) {
    if (v != null) {
      sum += v;
      n++;
    }
  }
  return n ? sum / n : null;
}
