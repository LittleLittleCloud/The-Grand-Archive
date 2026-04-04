/**
 * 类型定义
 */

/** sources.yaml 中的订阅源配置 */
export interface SourceConfig {
  name: string;
  url: string;
  category: string;
  enabled: boolean;
  fetch_interval: number;
  tags: string[];
  description: string;
}

/** 加载后的订阅源（包含解析后的抓取地址） */
export interface LoadedSource extends SourceConfig {
  requestUrl: string;
}

export interface SourcesConfig {
  sources: SourceConfig[];
}

/** categories.yaml 中的分类定义 */
export interface Category {
  id: string;
  name: string;
  description: string;
}

export interface CategoriesConfig {
  categories: Category[];
}

/** Feed 条目的 front matter metadata */
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
  /** Vault 内相对路径 (不含 .md)，如 feeds/finance/2026-03-12_xxx_abc123 */
  path: string;
}
