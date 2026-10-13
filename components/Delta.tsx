import { fmtDelta, fmtPct } from "@/lib/format";

interface Props {
  /** Absolute change in ₴ (null = unknown). */
  abs: number | null;
  /** Percent change. */
  pct: number | null;
  showPct?: boolean;
}

/** Price change: cheaper = good (green, ▼), pricier = bad (red, ▲). */
export function Delta({ abs, pct, showPct = true }: Props) {
  if (abs == null) return <span className="delta delta-none">—</span>;
  const cls = Math.abs(abs) < 0.005 ? "flat" : abs < 0 ? "good" : "bad";
  const arrow = cls === "flat" ? "•" : abs < 0 ? "▼" : "▲";
  return (
    <span className={`delta delta-${cls}`}>
      <span aria-hidden="true">{arrow}</span> {fmtDelta(abs)}
      {showPct && pct != null ? <span className="delta-pct"> ({fmtPct(pct)})</span> : null}
    </span>
  );
}

export function changeOf(now: number | null, then: number | null): { abs: number | null; pct: number | null } {
  if (now == null || then == null || then === 0) return { abs: null, pct: null };
  return { abs: now - then, pct: ((now - then) / then) * 100 };
}
