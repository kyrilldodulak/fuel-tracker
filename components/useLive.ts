"use client";

import { useCallback, useState } from "react";
import type { LiveResponse } from "@/lib/live";

export type LiveStatus = "idle" | "loading" | "ok" | "error";

function isLive(v: unknown): v is LiveResponse {
  if (typeof v !== "object" || v === null) return false;
  const o = v as Record<string, unknown>;
  return typeof o.fetchedAt === "string" && typeof o.brands === "object" && o.brands !== null;
}

export function useLive() {
  const [live, setLive] = useState<LiveResponse | null>(null);
  const [status, setStatus] = useState<LiveStatus>("idle");

  const refresh = useCallback(async () => {
    setStatus("loading");
    try {
      const res = await fetch("/api/live");
      const json: unknown = await res.json();
      if (!res.ok || !isLive(json) || Object.keys(json.brands).length === 0) throw new Error("bad response");
      setLive(json);
      setStatus("ok");
    } catch {
      setStatus("error");
    }
  }, []);

  return { live, status, refresh };
}
