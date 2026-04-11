import type { SearchResult } from "@dak/contract";

export interface IndexedEntry {
  id: string;
  title: string;
  content: string;
  source: string;
  category: string;
  published: string;
}

export interface SearchOptions {
  category?: string;
  source?: string;
  from?: string;
  to?: string;
  maxAge?: string; // ISO date cutoff from tier middleware
  limit?: number;
  offset?: number;
}

export interface SearchOutput {
  results: SearchResult[];
  total: number;
  tierFiltered: boolean;
}

export interface SearchEngine {
  /** Initialize / rebuild the full index from DB */
  init(): Promise<void>;

  /** Add or replace entries in the index */
  add(entries: IndexedEntry[]): void;

  /** Execute a search query with filters and pagination */
  search(query: string, options?: SearchOptions): SearchOutput;

  /** Dispose resources held by the engine */
  dispose(): void;
}
