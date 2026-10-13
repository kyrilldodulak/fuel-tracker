"use client";

import type { LiveStatus } from "./useLive";

const timeFmt = new Intl.DateTimeFormat("uk-UA", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Kyiv" });

export function LiveButton({ status, fetchedAt, onRefresh }: { status: LiveStatus; fetchedAt?: string; onRefresh: () => void }) {
  return (
    <>
      {status === "ok" && fetchedAt && <span className="muted small">Живі ціни · {timeFmt.format(new Date(fetchedAt))}</span>}
      {status === "error" && <span className="muted small">Не вдалося оновити</span>}{" "}
      <button type="button" className="live-btn muted small" onClick={onRefresh} disabled={status === "loading"}>
        {status === "loading" ? "Оновлюю…" : "↻ Оновити зараз"}
      </button>
    </>
  );
}
