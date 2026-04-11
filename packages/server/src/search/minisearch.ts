import MiniSearch from "minisearch";
import { getDb } from "../db/client";
import type { SearchResult } from "@dak/contract";
import type {
  SearchEngine,
  IndexedEntry,
  SearchOptions,
  SearchOutput,
} from "./interface";

export class MiniSearchEngine implements SearchEngine {
  private miniSearch: MiniSearch<IndexedEntry> | null = null;

  async init(): Promise<void> {
    const db = getDb();
    const rows = db
      .query("SELECT id, title, content, source, category, published FROM entries")
      .all() as IndexedEntry[];

    this.miniSearch = new MiniSearch<IndexedEntry>({
      fields: ["title", "content"],
      storeFields: ["title", "source", "category", "published"],
      searchOptions: {
        fuzzy: 0.2,
        prefix: true,
        boost: { title: 3 },
      },
    });

    this.miniSearch.addAll(rows);
    console.log(`🔍 MiniSearch index built: ${rows.length} entries`);
  }

  add(entries: IndexedEntry[]): void {
    if (!this.miniSearch) return;
    for (const entry of entries) {
      if (this.miniSearch.has(entry.id)) {
        this.miniSearch.replace(entry);
      } else {
        this.miniSearch.add(entry);
      }
    }
  }

  search(query: string, options?: SearchOptions): SearchOutput {
    if (!this.miniSearch) {
      return { results: [], total: 0, tierFiltered: false };
    }

    let results = this.miniSearch.search(query);

    if (options?.category) {
      results = results.filter((r) => r.category === options.category);
    }
    if (options?.source) {
      results = results.filter((r) => r.source === options.source);
    }

    let tierFiltered = false;
    const fromDate = options?.maxAge ?? options?.from;
    if (options?.maxAge) {
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

  dispose(): void {
    this.miniSearch = null;
  }
}
