import MiniSearch from "minisearch";
import { getDb } from "../db/client";
import type { Entry, SearchResult } from "@dak/contract";

interface IndexedEntry {
  id: string;
  title: string;
  content: string;
  source: string;
  category: string;
  published: string;
}

let miniSearch: MiniSearch<IndexedEntry>;

export async function buildSearchIndex(): Promise<void> {
  const db = getDb();
  const rows = db
    .query("SELECT id, title, source, category, published FROM entries")
    .all() as IndexedEntry[];

  miniSearch = new MiniSearch<IndexedEntry>({
    fields: ["title"],
    storeFields: ["title", "source", "category", "published"],
    searchOptions: {
      fuzzy: 0.2,
      prefix: true,
    },
  });

  miniSearch.addAll(rows);
  console.log(`🔍 Search index built: ${rows.length} entries`);
}

export function addToIndex(entries: IndexedEntry[]): void {
  if (!miniSearch) return;
  for (const entry of entries) {
    if (miniSearch.has(entry.id)) {
      miniSearch.replace(entry);
    } else {
      miniSearch.add(entry);
    }
  }
}

export function search(
  query: string,
  options?: {
    category?: string;
    source?: string;
    from?: string;
    to?: string;
    maxAge?: string; // ISO date cutoff from tier middleware
    limit?: number;
    offset?: number;
  }
): { results: SearchResult[]; total: number; tierFiltered: boolean } {
  if (!miniSearch) {
    return { results: [], total: 0, tierFiltered: false };
  }

  let results = miniSearch.search(query);

  // Apply filters
  if (options?.category) {
    results = results.filter((r) => r.category === options.category);
  }
  if (options?.source) {
    results = results.filter((r) => r.source === options.source);
  }

  // Determine if tier cutoff is more restrictive than user-supplied `from`
  let tierFiltered = false;
  const fromDate = options?.maxAge ?? options?.from;
  if (options?.maxAge) {
    // Check if maxAge is actually clipping results the user asked for
    const userFrom = options?.from;
    if (!userFrom || options.maxAge > userFrom) {
      tierFiltered = true;
    }
  }
  if (fromDate) {
    results = results.filter((r) => r.published >= fromDate);
  }
  if (options?.to) {
    const to = options.to;
    results = results.filter((r) => r.published <= to);
  }

  const total = results.length;

  const limit = options?.limit ?? 20;
  const offset = options?.offset ?? 0;
  const paged = results.slice(offset, offset + limit);

  return {
    results: paged.map((r) => ({
      id: r.id,
      title: r.title as string,
      source: r.source as string,
      category: r.category as string,
      published: r.published as string,
      score: r.score,
    })),
    total,
    tierFiltered,
  };
}
