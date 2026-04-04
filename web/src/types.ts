export interface EntryMeta {
  title: string;
  source: string;
  source_url: string;
  link: string;
  author: string;
  published: string;
  fetched: string;
  category: string;
  tags: string[];
  language: string;
  guid: string;
  hash: string;
  read: boolean;
  starred: boolean;
  filename: string;
  /** Vault 内相对路径，可用作 SPA 路由 */
  path: string;
}

export interface EntryWithContent extends EntryMeta {
  content: string;
}

export interface FetchStatus {
  name: string;
  url: string;
  category: string;
  lastFetched: string;
  lastResult: "success" | "error";
  lastError?: string;
  entriesSaved: number;
  entriesSkipped: number;
}

export interface SourceConfig {
  name: string;
  url: string;
  category: string;
  enabled: boolean;
  fetch_interval: number;
  tags: string[];
  description: string;
  status: FetchStatus | null;
}

export interface CategoryConfig {
  id: string;
  name: string;
  description: string;
}

export interface Stats {
  totalEntries: number;
  totalSources: number;
  totalCategories: number;
  entriesByCategory: Record<string, number>;
  entriesBySource: Record<string, number>;
  entriesByDate: Record<string, number>;
  recentEntries: EntryWithContent[];
  lastUpdated: string;
  tagCloud: Record<string, number>;
}
