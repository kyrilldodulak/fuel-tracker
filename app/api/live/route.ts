import { connection } from "next/server";
import { NETWORK_ADAPTERS } from "../../../scraper/sources/networks";
import type { LiveResponse } from "@/lib/live";
import type { BrandPrice } from "@/lib/types";

// Vercel Hobby cap; adapters are cut off at ADAPTER_TIMEOUT_MS.
export const maxDuration = 10;

const ADAPTER_TIMEOUT_MS = 8000;
const TTL_S = 600;

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, rej) => {
    timer = setTimeout(() => rej(new Error(`timeout ${ms}ms`)), ms);
  });
  return Promise.race([p, timeout]).finally(() => clearTimeout(timer));
}

async function scrapeAll(): Promise<LiveResponse> {
  const slugs = Object.keys(NETWORK_ADAPTERS);
  const results = await Promise.allSettled(slugs.map((s) => withTimeout(NETWORK_ADAPTERS[s](), ADAPTER_TIMEOUT_MS)));
  const brands: Record<string, BrandPrice[]> = {};
  const errors: Record<string, string> = {};
  results.forEach((r, i) => {
    if (r.status === "fulfilled" && r.value.length) brands[slugs[i]] = r.value;
    else errors[slugs[i]] = r.status === "rejected" ? String(r.reason instanceof Error ? r.reason.message : r.reason) : "empty";
  });
  return { fetchedAt: new Date().toISOString(), brands, errors };
}

// Per-instance memo (dedupes concurrent/repeated calls); the CDN header below does the cross-visitor caching.
let memo: { at: number; value: Promise<LiveResponse> } | null = null;

export async function GET() {
  // Opt out of build-time prerendering: always run on request.
  await connection();
  if (!memo || Date.now() - memo.at > TTL_S * 1000) {
    const value = scrapeAll();
    memo = { at: Date.now(), value };
    value.catch(() => {
      memo = null;
    });
  }
  const body = await memo.value;
  return Response.json(body, {
    headers: { "Cache-Control": `public, s-maxage=${TTL_S}, stale-while-revalidate=${TTL_S}` },
  });
}
