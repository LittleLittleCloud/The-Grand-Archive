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
