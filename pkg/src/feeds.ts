/**
 * Feeds 模块 — 提供对所有 feed 条目的访问
 */

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import type { FeedEntry } from "./types.js";

function loadFeeds(): FeedEntry[] {
  // Resolve data/feeds.json relative to the package root
  // Works both from src/ (dev) and dist/ (published)
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  const candidates = [
    resolve(__dirname, "..", "data", "feeds.json"),
    resolve(__dirname, "data", "feeds.json"),
  ];

  for (const p of candidates) {
    try {
      const raw = readFileSync(p, "utf-8");
      return JSON.parse(raw) as FeedEntry[];
    } catch {
      // try next
    }
  }
  throw new Error(
    `Cannot find feeds.json. Looked in:\n${candidates.join("\n")}`
  );
}

/** 所有 feed 条目 (按发布时间降序, 懒加载) */
let _feeds: FeedEntry[] | null = null;

function ensureLoaded(): FeedEntry[] {
  if (_feeds === null) _feeds = loadFeeds();
  return _feeds;
}

/** 获取所有 feed 条目 */
export function getFeeds(): FeedEntry[] {
  return ensureLoaded();
}

// Re-export as `feeds` for convenience
export { getFeeds as feeds };

/** 按分类获取 feed 条目 */
export function getFeedsByCategory(category: string): FeedEntry[] {
  return ensureLoaded().filter((f) => f.category === category);
}

/** 按来源获取 feed 条目 */
export function getFeedsBySource(source: string): FeedEntry[] {
  return ensureLoaded().filter((f) => f.source === source);
}

/** 按标签获取 feed 条目 (任一标签匹配) */
export function getFeedsByTags(tags: string[]): FeedEntry[] {
  const tagSet = new Set(tags.map((t) => t.toLowerCase()));
  return ensureLoaded().filter((f) =>
    f.tags.some((t) => tagSet.has(t.toLowerCase()))
  );
}

/** 按 ID (hash) 获取单个条目 */
export function getFeedById(id: string): FeedEntry | undefined {
  return ensureLoaded().find((f) => f.id === id);
}

/** 按时间范围获取 feed 条目 */
export function getFeedsByDateRange(from: string, to: string): FeedEntry[] {
  const fromTime = new Date(from).getTime();
  const toTime = new Date(to).getTime();
  return ensureLoaded().filter((f) => {
    const t = new Date(f.published).getTime();
    return t >= fromTime && t <= toTime;
  });
}

/** 获取所有分类 ID 列表 */
export function getCategories(): string[] {
  return [...new Set(ensureLoaded().map((f) => f.category))].sort();
}

/** 获取所有来源名称列表 */
export function getSources(): string[] {
  return [...new Set(ensureLoaded().map((f) => f.source))].sort();
}

/** 获取所有标签列表 */
export function getAllTags(): string[] {
  const tags = new Set<string>();
  for (const f of ensureLoaded()) {
    for (const t of f.tags) tags.add(t);
  }
  return [...tags].sort();
}

export type { FeedEntry } from "./types.js";
