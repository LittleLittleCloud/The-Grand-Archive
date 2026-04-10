/**
 * Public API types for the 大案牍库 SDK.
 * These mirror the server's contract schemas as plain TypeScript interfaces.
 */

export interface Entry {
  id: string;
  title: string;
  content: string | null;
  url: string | null;
  source: string;
  category:
    | "finance"
    | "news"
    | "tech"
    | "social"
    | "blog"
    | "podcast"
    | "uncategorized";
  tags: string[];
  author: string | null;
  language: string;
  published: string;
  created_at?: string;
}

export interface SearchRequest {
  q: string;
  category?: string;
  source?: string;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
}

export interface SearchResult {
  id: string;
  title: string;
  source: string;
  category: string;
  published: string;
  score: number;
}

export interface SearchResponse {
  results: SearchResult[];
  total: number;
  query: string;
  tier: "anonymous" | "free" | "premium";
  tierCutoff: string | null;
}

export interface FeedsRequest {
  category?: string;
  source?: string;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
}

export interface FeedsResponse {
  entries: Entry[];
  total: number;
}

export interface CategoryStat {
  category: string;
  count: number;
}

export interface SourceStat {
  source: string;
  count: number;
}

export interface StatsResponse {
  total: number;
  byCategory: CategoryStat[];
  bySource: SourceStat[];
  lastUpdated: string | null;
}
