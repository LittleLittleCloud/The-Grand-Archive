import type { Stats, SourceConfig, CategoryConfig, EntryMeta, EntryWithContent } from "./types";

const BASE = import.meta.env.BASE_URL + "data";

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}/${path}`);
  if (!res.ok) throw new Error(`Failed to fetch ${path}: ${res.status}`);
  return res.json();
}

export const api = {
  getStats: () => fetchJson<Stats>("stats.json"),
  getSources: () => fetchJson<SourceConfig[]>("sources.json"),
  getCategories: () => fetchJson<CategoryConfig[]>("categories.json"),
  getEntries: () => fetchJson<EntryMeta[]>("entries.json"),
  getEntriesByCategory: (id: string) => fetchJson<EntryMeta[]>(`entries-${id}.json`),
  /** Fetch a single entry with full content by its path (e.g. feeds/finance/2026-03-12_xxx_abc123) */
  getEntry: (path: string) => fetchJson<EntryWithContent>(`entry/${path}.json`),
};
