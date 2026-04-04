/**
 * Search 模块 — 基于 MiniSearch 的多维度搜索引擎
 *
 * 支持的搜索维度：
 * - 关键词全文搜索 (标题 + 正文)
 * - 按属性过滤：category / source / tags / author / language
 * - 按标题搜索 (titleOnly)
 * - 按发布时间范围过滤
 */

import MiniSearch from "minisearch";
import type { FeedEntry, SearchOptions, SearchResult, IndexStats } from "./types.js";
import { getFeeds } from "./feeds.js";

/** 搜索索引类 */
export class FeedSearchIndex {
  private miniSearch: MiniSearch<FeedEntry>;
  private entries: Map<string, FeedEntry>;

  constructor(data?: FeedEntry[]) {
    const entries = data ?? getFeeds();

    this.entries = new Map(entries.map((e) => [e.id, e]));

    this.miniSearch = new MiniSearch<FeedEntry>({
      fields: ["title", "content", "source", "author", "tags_text"],
      storeFields: ["id"],
      idField: "id",
      searchOptions: {
        boost: { title: 3, tags_text: 2, source: 1.5, content: 1 },
        fuzzy: 0.2,
        prefix: true,
      },
      // 将 tags 数组合并为可搜索的文本
      extractField: (doc, fieldName) => {
        if (fieldName === "tags_text") {
          return (doc as FeedEntry).tags.join(" ");
        }
        return (doc as unknown as Record<string, unknown>)[fieldName] as string;
      },
    });

    this.miniSearch.addAll(entries);
  }

  /**
   * 搜索 feed 条目
   *
   * @example
   * // 全文搜索
   * index.search({ query: "inflation" })
   *
   * // 按分类 + 关键词
   * index.search({ query: "oil prices", category: "finance" })
   *
   * // 按时间范围
   * index.search({ dateFrom: "2026-03-01", dateTo: "2026-03-31" })
   *
   * // 按标签
   * index.search({ tags: ["经济", "美国"] })
   *
   * // 仅搜索标题
   * index.search({ query: "jobs report", titleOnly: true })
   */
  search(options: SearchOptions): SearchResult[] {
    const {
      query,
      category,
      source,
      tags,
      author,
      language,
      dateFrom,
      dateTo,
      titleOnly,
      limit = 50,
    } = options;

    let results: SearchResult[];

    if (query && query.trim().length > 0) {
      // 使用 MiniSearch 进行文本搜索
      const searchOpts: Parameters<typeof this.miniSearch.search>[1] = {};
      if (titleOnly) {
        searchOpts.fields = ["title"];
      }

      const msResults = this.miniSearch.search(query, searchOpts);
      results = msResults.map((r) => ({
        entry: this.entries.get(r.id as string)!,
        score: r.score,
        matchedFields: r.match
          ? Object.keys(r.match).map((f) => (f === "tags_text" ? "tags" : f))
          : [],
      }));
    } else {
      // 无关键词，返回所有条目
      results = [...this.entries.values()].map((entry) => ({
        entry,
        score: 1,
        matchedFields: [],
      }));
    }

    // 应用属性过滤
    results = this.applyFilters(results, {
      category,
      source,
      tags,
      author,
      language,
      dateFrom,
      dateTo,
    });

    // 排序：有关键词时按评分，无关键词时按发布时间
    if (!query || query.trim().length === 0) {
      results.sort(
        (a, b) =>
          new Date(b.entry.published).getTime() -
          new Date(a.entry.published).getTime()
      );
    }

    return results.slice(0, limit);
  }

  /** 获取索引统计信息 */
  stats(): IndexStats {
    const entries = [...this.entries.values()];
    const categories = new Set<string>();
    const sources = new Set<string>();
    const tags = new Set<string>();
    let earliest = "";
    let latest = "";

    for (const e of entries) {
      categories.add(e.category);
      sources.add(e.source);
      for (const t of e.tags) tags.add(t);
      if (!earliest || e.published < earliest) earliest = e.published;
      if (!latest || e.published > latest) latest = e.published;
    }

    return {
      totalDocuments: entries.length,
      categories: [...categories].sort(),
      sources: [...sources].sort(),
      tags: [...tags].sort(),
      dateRange: { earliest, latest },
    };
  }

  /** 获取自动补全建议 */
  suggest(query: string, limit = 10): string[] {
    const results = this.miniSearch.autoSuggest(query, { fuzzy: 0.2 });
    return results.slice(0, limit).map((r) => r.suggestion);
  }

  private applyFilters(
    results: SearchResult[],
    filters: Omit<SearchOptions, "query" | "titleOnly" | "limit">
  ): SearchResult[] {
    let filtered = results;

    if (filters.category) {
      const cat = filters.category.toLowerCase();
      filtered = filtered.filter(
        (r) => r.entry.category.toLowerCase() === cat
      );
    }

    if (filters.source) {
      const src = filters.source.toLowerCase();
      filtered = filtered.filter((r) =>
        r.entry.source.toLowerCase().includes(src)
      );
    }

    if (filters.tags && filters.tags.length > 0) {
      const tagSet = new Set(filters.tags.map((t) => t.toLowerCase()));
      filtered = filtered.filter((r) =>
        r.entry.tags.some((t) => tagSet.has(t.toLowerCase()))
      );
    }

    if (filters.author) {
      const auth = filters.author.toLowerCase();
      filtered = filtered.filter((r) =>
        r.entry.author.toLowerCase().includes(auth)
      );
    }

    if (filters.language) {
      const lang = filters.language.toLowerCase();
      filtered = filtered.filter(
        (r) => r.entry.language.toLowerCase() === lang
      );
    }

    if (filters.dateFrom) {
      const fromTime = new Date(filters.dateFrom).getTime();
      filtered = filtered.filter(
        (r) => new Date(r.entry.published).getTime() >= fromTime
      );
    }

    if (filters.dateTo) {
      // dateTo is inclusive, so we add a day
      const toDate = new Date(filters.dateTo);
      toDate.setDate(toDate.getDate() + 1);
      const toTime = toDate.getTime();
      filtered = filtered.filter(
        (r) => new Date(r.entry.published).getTime() < toTime
      );
    }

    return filtered;
  }
}

/** 创建搜索索引 (使用内置的 feeds 数据) */
export function createSearchIndex(data?: FeedEntry[]): FeedSearchIndex {
  return new FeedSearchIndex(data);
}

/**
 * 快捷搜索函数 — 一次性创建索引并搜索
 *
 * 注意：如果需要多次搜索，建议用 createSearchIndex() 创建索引后复用
 */
export function search(options: SearchOptions): SearchResult[] {
  const index = createSearchIndex();
  return index.search(options);
}

export type { SearchOptions, SearchResult, IndexStats } from "./types.js";
