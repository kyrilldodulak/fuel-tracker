import fs from "node:fs";
import path from "node:path";

export const DATA_DIR = path.join(import.meta.dirname, "..", "data");

export function readJson<T>(name: string, fallback: T): T {
  const file = path.join(DATA_DIR, name);
  return fs.existsSync(file) ? (JSON.parse(fs.readFileSync(file, "utf8")) as T) : fallback;
}

/** Writes with keys sorted so diffs between runs stay minimal. */
export function writeJson(name: string, data: unknown) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(path.join(DATA_DIR, name), JSON.stringify(sortKeys(data), null, 1) + "\n");
}

function sortKeys(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(sortKeys);
  if (v && typeof v === "object")
    return Object.fromEntries(
      Object.keys(v)
        .sort()
        .map((k) => [k, sortKeys((v as Record<string, unknown>)[k])]),
    );
  return v;
}

/** Merges day-keyed records; existing days are kept unless `overwrite` (fresh scrape wins). */
export function mergeDays<T extends object>(
  target: Record<string, T>,
  incoming: Record<string, T>,
  overwrite: boolean,
) {
  for (const [day, value] of Object.entries(incoming)) {
    target[day] = overwrite || !target[day] ? { ...target[day], ...value } : target[day];
  }
}
