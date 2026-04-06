/**
 * RSS 抓取器 — 从订阅源获取条目并保存为 Markdown 文件
 */

import RSSParser from "rss-parser";
import TurndownService from "turndown";
import { createHash } from "crypto";
import { existsSync, mkdirSync, writeFileSync, readFileSync, readdirSync, renameSync, unlinkSync, statSync } from "fs";
import { resolve, join } from "path";
import matter from "gray-matter";
import type { LoadedSource, EntryMeta } from "./types";

const ROOT = resolve(import.meta.dir, "..");
const FEEDS_DIR = resolve(ROOT, "feeds");
const STATUS_FILE = resolve(ROOT, "config/fetch-status.json");

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

/** 加载已有的抓取状态 */
function loadFetchStatus(): Record<string, FetchStatus> {
  try {
    if (existsSync(STATUS_FILE)) {
      return JSON.parse(readFileSync(STATUS_FILE, "utf-8"));
    }
  } catch { /* ignore */ }
  return {};
}

/** 保存抓取状态 */
function saveFetchStatus(status: Record<string, FetchStatus>) {
  writeFileSync(STATUS_FILE, JSON.stringify(status, null, 2), "utf-8");
}

/** 更新单个源的状态 */
export function updateSourceStatus(
  source: LoadedSource,
  result: "success" | "error",
  saved: number,
  skipped: number,
  error?: string
) {
  const status = loadFetchStatus();
  status[source.url] = {
    name: source.name,
    url: source.url,
    category: source.category,
    lastFetched: new Date().toISOString(),
    lastResult: result,
    lastError: error,
    entriesSaved: saved,
    entriesSkipped: skipped,
  };
  saveFetchStatus(status);
}

/** 获取所有源的抓取状态 */
export function getAllFetchStatus(): Record<string, FetchStatus> {
  return loadFetchStatus();
}

const parser = new RSSParser({
  timeout: 30_000,
  headers: {
    "User-Agent": "DaAnDuKu-RSS-Fetcher/1.0",
  },
});

/** 生成内容哈希（用于去重） */
function contentHash(text: string): string {
  return createHash("md5").update(text).digest("hex").slice(0, 12);
}

/** 清理文件名中的非法字符 */
function sanitizeFilename(name: string): string {
  return name
    .replace(/[\/\\:*?"<>|]/g, "_")
    .replace(/\s+/g, "_")
    .slice(0, 80);
}

/** 检查条目是否已存在（通过 guid 或 hash 去重） */
function entryExists(categoryDir: string, guid: string, hash: string): boolean {
  if (!existsSync(categoryDir)) return false;

  const files = readdirSync(categoryDir).filter((f) => f.endsWith(".md"));
  for (const file of files) {
    try {
      // 简单检查文件名中是否包含 hash，避免每次都完整解析
      // Skip 0-byte files — they are incomplete writes that should be retried
      if (file.includes(hash) && statSync(join(categoryDir, file)).size > 0) return true;
    } catch {
      // ignore
    }
  }
  return false;
}

const turndown = new TurndownService({ headingStyle: "atx", codeBlockStyle: "fenced" });

/** 将 HTML 转为 Markdown（使用 turndown 库） */
function htmlToMarkdown(html: string): string {
  if (!html) return "";
  return turndown.turndown(html);
}

/** 从单个订阅源抓取并保存条目 */
export async function fetchSource(
  source: LoadedSource
): Promise<{ saved: number; skipped: number; errors: number }> {
  const categoryDir = resolve(FEEDS_DIR, source.category);
  if (!existsSync(categoryDir)) {
    mkdirSync(categoryDir, { recursive: true });
  }

  let feed;
  try {
    feed = await parser.parseURL(source.requestUrl);
  } catch (err) {
    const errMsg = (err as Error).message;
    console.error(`  ✗ 无法获取 [${source.name}]: ${errMsg}`);
    updateSourceStatus(source, "error", 0, 0, errMsg);
    return { saved: 0, skipped: 0, errors: 1 };
  }

  let saved = 0;
  let skipped = 0;

  for (const item of feed.items) {
    const title = item.title || "无标题";
    const link = item.link || "";
    const guid = item.guid || item.id || link;
    const content = item["content:encoded"] || item.content || item.contentSnippet || item.summary || "";
    const hash = contentHash(`${guid}${title}`);

    // 去重检查
    if (entryExists(categoryDir, guid, hash)) {
      skipped++;
      continue;
    }

    const published = item.pubDate || item.isoDate || "";
    const now = new Date().toISOString();
    const datePrefix = published
      ? new Date(published).toISOString().slice(0, 10)
      : new Date().toISOString().slice(0, 10);

    const meta: EntryMeta = {
      title,
      source: source.name,
      source_url: source.url,
      link,
      author: item.creator || item.author || "",
      published,
      fetched: now,
      category: source.category,
      tags: [...source.tags],
      language: "",
      guid,
      hash,
      read: false,
      starred: false,
    };

    const markdown = htmlToMarkdown(content);
    const fileContent = matter.stringify(markdown ? `\n${markdown}\n` : "\n", meta);

    const filename = `${datePrefix}_${sanitizeFilename(title)}_${hash}.md`;
    const filepath = join(categoryDir, filename);

    const tmpPath = filepath + ".tmp";
    try {
      writeFileSync(tmpPath, fileContent, "utf-8");
      renameSync(tmpPath, filepath);
      saved++;
    } catch (err) {
      console.error(`  ✗ 写入失败 [${title}]: ${(err as Error).message}`);
      try { unlinkSync(tmpPath); } catch { /* ignore */ }
    }
  }

  updateSourceStatus(source, "success", saved, skipped);
  return { saved, skipped, errors: 0 };
}
