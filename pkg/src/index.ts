/**
 * 包主入口 — 导出 feeds 和 search 模块
 */

// ── Feeds ──
export {
  feeds,
  getFeeds,
  getFeedsByCategory,
  getFeedsBySource,
  getFeedsByTags,
  getFeedById,
  getFeedsByDateRange,
  getCategories,
  getSources,
  getAllTags,
} from "./feeds.js";

// ── Search ──
export {
  FeedSearchIndex,
  createSearchIndex,
  search,
} from "./search.js";

// ── Types ──
export type {
  FeedEntry,
  SearchOptions,
  SearchResult,
  IndexStats,
} from "./types.js";
