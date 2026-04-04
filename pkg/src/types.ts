/**
 * Feed 条目类型定义
 */

/** Feed 条目的元数据 (来自 frontmatter) */
export interface FeedEntry {
  /** 唯一 ID (hash) */
  id: string;
  /** 标题 */
  title: string;
  /** 来源名称 */
  source: string;
  /** 来源 URL */
  sourceUrl: string;
  /** 文章链接 */
  link: string;
  /** 作者 */
  author: string;
  /** 发布时间 (ISO string) */
  published: string;
  /** 抓取时间 (ISO string) */
  fetched: string;
  /** 分类 ID */
  category: string;
  /** 标签列表 */
  tags: string[];
  /** 语言 */
  language: string;
  /** RSS GUID */
  guid: string;
  /** 文件名 (不含路径) */
  filename: string;
  /** Vault 内相对路径 (不含 .md)，如 feeds/finance/2026-03-12_xxx_abc123 */
  path: string;
  /** 正文内容 (Markdown) */
  content: string;
}

/** 搜索选项 */
export interface SearchOptions {
  /** 搜索关键词 (全文搜索) */
  query?: string;
  /** 按分类过滤 */
  category?: string;
  /** 按来源过滤 */
  source?: string;
  /** 按标签过滤 (任一匹配) */
  tags?: string[];
  /** 按作者过滤 */
  author?: string;
  /** 按语言过滤 */
  language?: string;
  /** 发布时间起始 (ISO date string, inclusive) */
  dateFrom?: string;
  /** 发布时间截止 (ISO date string, inclusive) */
  dateTo?: string;
  /** 仅搜索标题 */
  titleOnly?: boolean;
  /** 返回结果数量上限 */
  limit?: number;
}

/** 搜索结果条目 */
export interface SearchResult {
  /** 匹配的 feed 条目 */
  entry: FeedEntry;
  /** 搜索相关度评分 */
  score: number;
  /** 匹配的字段 */
  matchedFields: string[];
}

/** 搜索索引统计 */
export interface IndexStats {
  /** 索引中的文档总数 */
  totalDocuments: number;
  /** 分类列表 */
  categories: string[];
  /** 来源列表 */
  sources: string[];
  /** 标签列表 */
  tags: string[];
  /** 时间范围 */
  dateRange: { earliest: string; latest: string };
}
