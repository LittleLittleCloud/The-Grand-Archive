/**
 * 构建数据脚本 — 读取 feeds/ 目录下所有 Markdown 文件，
 * 解析 frontmatter + 正文，生成 pkg/data/feeds.json
 *
 * 执行: bun run scripts/build-data.ts
 */

import { readdirSync, readFileSync, mkdirSync, writeFileSync, existsSync, statSync } from "fs";
import { resolve, join } from "path";
import matter from "gray-matter";

interface FeedEntry {
  id: string;
  title: string;
  source: string;
  sourceUrl: string;
  link: string;
  author: string;
  published: string;
  fetched: string;
  category: string;
  tags: string[];
  language: string;
  guid: string;
  filename: string;
  content: string;
}

const ROOT = resolve(import.meta.dir, "..");
const FEEDS_DIR = resolve(ROOT, "..", "feeds");
const OUT_DIR = resolve(ROOT, "data");

function isDirectory(path: string): boolean {
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
}

function readAllEntries(): FeedEntry[] {
  const entries: FeedEntry[] = [];

  if (!existsSync(FEEDS_DIR)) {
    console.error(`❌ feeds 目录不存在: ${FEEDS_DIR}`);
    process.exit(1);
  }

  const categories = readdirSync(FEEDS_DIR).filter((name) =>
    isDirectory(join(FEEDS_DIR, name))
  );

  console.log(`📁 发现 ${categories.length} 个分类: ${categories.join(", ")}`);

  for (const category of categories) {
    const dir = join(FEEDS_DIR, category);
    const files = readdirSync(dir).filter(
      (f) => f.endsWith(".md") && f !== ".gitkeep"
    );

    let parsed = 0;
    let skipped = 0;

    for (const file of files) {
      try {
        const raw = readFileSync(join(dir, file), "utf-8");
        const { data, content } = matter(raw);

        // 验证必要字段
        if (!data.title && !data.hash) {
          skipped++;
          continue;
        }

        entries.push({
          id: (data.hash as string) || file.replace(/\.md$/, ""),
          title: (data.title as string) || "",
          source: (data.source as string) || "",
          sourceUrl: (data.source_url as string) || "",
          link: (data.link as string) || "",
          author: (data.author as string) || "",
          published: normalizeDate(data.published as string),
          fetched: normalizeDate(data.fetched as string),
          category,
          tags: Array.isArray(data.tags)
            ? (data.tags as string[])
            : typeof data.tags === "string"
              ? [data.tags]
              : [],
          language: (data.language as string) || "",
          guid: (data.guid as string) || "",
          filename: file,
          content: content.trim(),
        });

        parsed++;
      } catch (err) {
        skipped++;
      }
    }

    console.log(
      `  ${category}: ${parsed} 条目已解析` +
        (skipped > 0 ? `, ${skipped} 跳过` : "")
    );
  }

  // 按发布时间降序排列
  entries.sort((a, b) => {
    const ta = new Date(b.published || b.fetched).getTime() || 0;
    const tb = new Date(a.published || a.fetched).getTime() || 0;
    return ta - tb;
  });

  // 去重：同一 ID 只保留第一条
  const seen = new Set<string>();
  const unique: FeedEntry[] = [];
  for (const e of entries) {
    if (seen.has(e.id)) continue;
    seen.add(e.id);
    unique.push(e);
  }

  if (unique.length < entries.length) {
    console.log(`  ⚠️  去重: ${entries.length - unique.length} 条重复 ID`);
  }

  return unique;
}

function normalizeDate(dateStr: unknown): string {
  if (!dateStr) return "";
  const str = String(dateStr);
  try {
    return new Date(str).toISOString();
  } catch {
    return str;
  }
}

// ── Main ──

console.log("\n🔨 构建 feeds 数据...\n");

const entries = readAllEntries();

mkdirSync(OUT_DIR, { recursive: true });

const outPath = join(OUT_DIR, "feeds.json");
writeFileSync(outPath, JSON.stringify(entries, null, 0));

const sizeKB = (statSync(outPath).size / 1024).toFixed(1);
console.log(
  `\n✅ 生成完成: ${outPath}\n` +
    `   ${entries.length} 条目, ${sizeKB} KB\n`
);
