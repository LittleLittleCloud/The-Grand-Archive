/**
 * 静态数据生成器 — 从 feeds/ 目录生成 JSON 供 SPA 使用
 * 输出到 web/public/data/ 目录，部署到 GitHub Pages 后可直接 fetch
 */

import { readdirSync, readFileSync, mkdirSync, writeFileSync, existsSync } from "fs";
import { resolve, join } from "path";
import matter from "gray-matter";
import { loadSources, loadCategories } from "./config";
import { getAllFetchStatus, type FetchStatus } from "./fetcher";
import type { EntryMeta, LoadedSource, Category } from "./types";

const ROOT = resolve(import.meta.dir, "..");
const FEEDS_DIR = resolve(ROOT, "feeds");
const OUT_DIR = resolve(ROOT, "web/public/data");

interface EntryData extends EntryMeta {
  content: string;
  fullContent: string;
  filename: string;
  path: string;
}

interface StatsData {
  totalEntries: number;
  totalSources: number;
  totalCategories: number;
  entriesByCategory: Record<string, number>;
  entriesBySource: Record<string, number>;
  entriesByDate: Record<string, number>;
  recentEntries: EntryData[];
  lastUpdated: string;
  tagCloud: Record<string, number>;
}

function readAllEntries(): EntryData[] {
  const categories = loadCategories();
  const entries: EntryData[] = [];

  // Collect all category IDs from config
  const catIds = new Set(categories.map((c) => c.id));

  // Also scan any existing directories in feeds/ (in case of leftover categories)
  if (existsSync(FEEDS_DIR)) {
    for (const name of readdirSync(FEEDS_DIR)) {
      const full = resolve(FEEDS_DIR, name);
      try {
        if (readdirSync(full)) catIds.add(name);
      } catch {
        // not a directory
      }
    }
  }

  for (const catId of catIds) {
    const dir = resolve(FEEDS_DIR, catId);
    if (!existsSync(dir)) continue;

    const files = readdirSync(dir).filter((f) => f.endsWith(".md") && f !== ".gitkeep");

    for (const file of files) {
      try {
        const raw = readFileSync(join(dir, file), "utf-8");
        const { data, content } = matter(raw);
        const trimmed = content.trim();
        const pathWithoutExt = `feeds/${catId}/${file.replace(/\.md$/, '')}`;
        entries.push({
          ...(data as EntryMeta),
          content: trimmed.slice(0, 500), // 截取摘要
          fullContent: trimmed, // 完整内容 (用于 per-entry JSON)
          filename: file,
          path: pathWithoutExt,
        });
      } catch {
        // skip malformed files
      }
    }
  }

  // Sort by fetched time descending
  entries.sort((a, b) => new Date(b.fetched).getTime() - new Date(a.fetched).getTime());
  return entries;
}

function generateStats(entries: EntryData[], sources: LoadedSource[], categories: Category[]): StatsData {
  const entriesByCategory: Record<string, number> = {};
  const entriesBySource: Record<string, number> = {};
  const entriesByDate: Record<string, number> = {};
  const tagCloud: Record<string, number> = {};

  for (const entry of entries) {
    // By category
    entriesByCategory[entry.category] = (entriesByCategory[entry.category] || 0) + 1;

    // By source
    entriesBySource[entry.source] = (entriesBySource[entry.source] || 0) + 1;

    // By date
    const date = entry.published
      ? new Date(entry.published).toISOString().slice(0, 10)
      : entry.fetched
        ? new Date(entry.fetched).toISOString().slice(0, 10)
        : "unknown";
    if (date !== "unknown") {
      entriesByDate[date] = (entriesByDate[date] || 0) + 1;
    }

    // Tags
    if (entry.tags) {
      for (const tag of entry.tags) {
        tagCloud[tag] = (tagCloud[tag] || 0) + 1;
      }
    }
  }

  return {
    totalEntries: entries.length,
    totalSources: sources.length,
    totalCategories: categories.length,
    entriesByCategory,
    entriesBySource,
    entriesByDate,
    recentEntries: entries.filter((e) => {
      const d = e.published || e.fetched;
      if (!d) return false;
      const t = new Date(d).getTime();
      return !isNaN(t) && Date.now() - t <= 3 * 24 * 60 * 60 * 1000;
    }).map(({ fullContent, ...rest }) => rest),
    lastUpdated: new Date().toISOString(),
    tagCloud,
  };
}

export function generateStaticData() {
  mkdirSync(OUT_DIR, { recursive: true });

  const sources = loadSources();
  const categories = loadCategories();
  const entries = readAllEntries();
  const stats = generateStats(entries, sources, categories);

  // Write stats
  writeFileSync(join(OUT_DIR, "stats.json"), JSON.stringify(stats, null, 2), "utf-8");

  // Write sources with fetch status
  const fetchStatus = getAllFetchStatus();
  const sourcesWithStatus = sources.map(({ requestUrl, ...rest }) => ({
    ...rest,
    status: fetchStatus[rest.url] || null,
  }));
  writeFileSync(join(OUT_DIR, "sources.json"), JSON.stringify(sourcesWithStatus, null, 2), "utf-8");

  // Write categories
  writeFileSync(join(OUT_DIR, "categories.json"), JSON.stringify(categories, null, 2), "utf-8");

  // Write entries per category (with summary only, no fullContent)
  for (const cat of categories) {
    const catEntries = entries
      .filter((e) => e.category === cat.id)
      .map(({ fullContent, ...rest }) => rest);
    writeFileSync(
      join(OUT_DIR, `entries-${cat.id}.json`),
      JSON.stringify(catEntries, null, 2),
      "utf-8"
    );
  }

  // Write all entries (light version without content for listing)
  const entriesLight = entries.map(({ content, fullContent, ...rest }) => rest);
  writeFileSync(join(OUT_DIR, "entries.json"), JSON.stringify(entriesLight, null, 2), "utf-8");

  // Write per-entry JSON files with full content (for reading page)
  let entryJsonCount = 0;
  for (const entry of entries) {
    const entryDir = join(OUT_DIR, "entry", ...entry.path.split("/").slice(0, -1));
    mkdirSync(entryDir, { recursive: true });
    const { fullContent, content: _summary, ...meta } = entry;
    const entryWithContent = { ...meta, content: fullContent };
    writeFileSync(
      join(OUT_DIR, "entry", `${entry.path}.json`),
      JSON.stringify(entryWithContent),
      "utf-8"
    );
    entryJsonCount++;
  }

  console.log(`✅ 静态数据已生成到 ${OUT_DIR}`);
  console.log(`   ${entries.length} 条目 | ${sources.length} 订阅源 | ${categories.length} 分类 | ${entryJsonCount} 条目详情`);
}

// Run directly
if (import.meta.main) {
  generateStaticData();
}
