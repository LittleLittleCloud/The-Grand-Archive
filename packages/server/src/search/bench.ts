/**
 * Benchmark: MiniSearch vs FTS5 search engine
 *
 * Run:  bun run src/search/bench.ts
 *
 * Uses an in-memory SQLite DB populated with synthetic entries,
 * then compares init / add / search performance of both engines.
 */

process.env.DB_PATH = ":memory:";

import { initDb, getDb } from "../db/client";
import { MiniSearchEngine } from "./minisearch";
import { Fts5SearchEngine } from "./fts5";
import type { SearchEngine, IndexedEntry } from "./interface";

// ── helpers ────────────────────────────────────────────────

function randomFrom<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

const CATEGORIES = ["finance", "news", "tech", "social", "blog"] as const;
const SOURCES = ["Bloomberg", "Reuters", "CNBC", "AP News", "BBC Chinese", "TechCrunch", "Hacker News"];

const TITLE_PARTS_ZH = [
  "中国人民银行", "发布", "新政策", "市场", "分析", "科技", "人工智能",
  "经济", "增长", "数据", "报告", "美联储", "加息", "降息", "央行",
  "股市", "房地产", "区块链", "芯片", "出口", "贸易", "制裁",
  "通货膨胀", "就业", "消费", "投资", "能源", "石油", "黄金",
];

const TITLE_PARTS_EN = [
  "Federal Reserve", "raises", "interest rates", "market analysis",
  "tech stocks", "AI breakthrough", "quarterly earnings", "GDP growth",
  "inflation data", "unemployment", "trade deal", "startup funding",
  "IPO", "cryptocurrency", "regulation", "supply chain", "chip shortage",
  "oil prices", "gold rally", "bond yields", "housing market",
];

const CONTENT_PARTS = [
  "根据最新数据显示，全球经济正在经历显著的结构性变化。",
  "分析师指出，当前市场走势受到多重因素影响。",
  "According to the latest report, the economic outlook remains uncertain.",
  "Experts predict significant changes in monetary policy direction.",
  "投资者需要关注以下几个关键指标的变化趋势。",
  "The central bank is expected to make a decision next week.",
  "技术创新正在推动产业升级和经济转型。",
  "Supply chain disruptions continue to impact global trade.",
  "新的监管框架将对行业产生深远影响。",
  "Market participants are closely watching developments in the region.",
];

function generateEntry(i: number): {
  id: string;
  title: string;
  content: string;
  source: string;
  category: string;
  published: string;
} {
  const titleParts = Math.random() > 0.4 ? TITLE_PARTS_ZH : TITLE_PARTS_EN;
  const title = Array.from({ length: 3 + Math.floor(Math.random() * 3) }, () =>
    randomFrom(titleParts)
  ).join(" ");

  const content = Array.from({ length: 2 + Math.floor(Math.random() * 3) }, () =>
    randomFrom(CONTENT_PARTS)
  ).join(" ");

  const d = new Date();
  d.setDate(d.getDate() - Math.floor(Math.random() * 365));

  return {
    id: `bench-${i}`,
    title,
    content,
    source: randomFrom(SOURCES),
    category: randomFrom(CATEGORIES),
    published: d.toISOString().slice(0, 10) + "T12:00:00Z",
  };
}

// ── seed DB ────────────────────────────────────────────────

const ENTRY_COUNT = 10_000;
const SEARCH_QUERIES = [
  "人民银行",
  "interest rates",
  "加息",
  "AI",
  "市场分析",
  "Federal Reserve",
  "经济增长",
  "chip shortage",
  "黄金 石油",
  "startup funding",
];

console.log(`\n📊 Search Engine Benchmark`);
console.log(`   Entries: ${ENTRY_COUNT.toLocaleString()}`);
console.log(`   Queries: ${SEARCH_QUERIES.length}\n`);

initDb();
const db = getDb();

console.log("Seeding database...");
const entries = Array.from({ length: ENTRY_COUNT }, (_, i) => generateEntry(i));

const insertStmt = db.prepare(
  `INSERT OR IGNORE INTO entries (id, title, content, url, source, category, tags, published)
   VALUES (?, ?, ?, NULL, ?, ?, '[]', ?)`
);
const insertAll = db.transaction(
  (items: typeof entries) => {
    for (const e of items) {
      insertStmt.run(e.id, e.title, e.content, e.source, e.category, e.published);
    }
  }
);
insertAll(entries);
console.log(`Seeded ${ENTRY_COUNT.toLocaleString()} entries\n`);

// ── benchmark runner ───────────────────────────────────────

// ── memory helpers ─────────────────────────────────────────

function formatMB(bytes: number): string {
  return (bytes / 1024 / 1024).toFixed(2) + " MB";
}

function getMemoryUsage() {
  if (typeof Bun !== "undefined") {
    // Bun: use process.memoryUsage() which returns rss, heapTotal, heapUsed, external
    return process.memoryUsage();
  }
  return process.memoryUsage();
}

// Force GC if available (bun --smol or node --expose-gc)
function tryGC() {
  if (typeof Bun !== "undefined" && typeof Bun.gc === "function") {
    Bun.gc(true);
  } else if (typeof globalThis.gc === "function") {
    globalThis.gc();
  }
}

interface BenchResult {
  engine: string;
  initMs: number;
  addMs: number;
  searchAvgMs: number;
  memBeforeInit: { rss: number; heapUsed: number };
  memAfterInit: { rss: number; heapUsed: number };
  memAfterSearch: { rss: number; heapUsed: number };
  searchResults: { query: string; total: number; topScore: number }[];
}

async function benchEngine(
  name: string,
  engine: SearchEngine
): Promise<BenchResult> {
  // Measure memory before init
  tryGC();
  const memBeforeInit = getMemoryUsage();

  // init
  const t0 = performance.now();
  await engine.init();
  const initMs = performance.now() - t0;

  tryGC();
  const memAfterInit = getMemoryUsage();

  // add (simulate 100 new entries)
  const newEntries: IndexedEntry[] = Array.from({ length: 100 }, (_, i) => {
    const e = generateEntry(ENTRY_COUNT + i);
    // Also insert into DB so FTS5 can find the rowid
    db.prepare(
      `INSERT OR IGNORE INTO entries (id, title, content, url, source, category, tags, published)
       VALUES (?, ?, ?, NULL, ?, ?, '[]', ?)`
    ).run(e.id, e.title, e.content, e.source, e.category, e.published);
    return {
      id: e.id,
      title: e.title,
      content: e.content,
      source: e.source,
      category: e.category,
      published: e.published,
    };
  });

  const t1 = performance.now();
  engine.add(newEntries);
  const addMs = performance.now() - t1;

  // search
  const searchResults: BenchResult["searchResults"] = [];
  const ITERATIONS = 50; // run each query N times for stable avg

  const t2 = performance.now();
  for (let i = 0; i < ITERATIONS; i++) {
    for (const q of SEARCH_QUERIES) {
      const result = engine.search(q, { limit: 20 });
      if (i === 0) {
        searchResults.push({
          query: q,
          total: result.total,
          topScore: result.results[0]?.score ?? 0,
        });
      }
    }
  }
  const searchTotalMs = performance.now() - t2;
  const searchAvgMs = searchTotalMs / (ITERATIONS * SEARCH_QUERIES.length);

  tryGC();
  const memAfterSearch = getMemoryUsage();

  engine.dispose();

  return {
    engine: name,
    initMs,
    addMs,
    searchAvgMs,
    memBeforeInit: { rss: memBeforeInit.rss, heapUsed: memBeforeInit.heapUsed },
    memAfterInit: { rss: memAfterInit.rss, heapUsed: memAfterInit.heapUsed },
    memAfterSearch: { rss: memAfterSearch.rss, heapUsed: memAfterSearch.heapUsed },
    searchResults,
  };
}

// ── run benchmarks ─────────────────────────────────────────

async function main() {
  // Clean up any leftover FTS table from previous run
  try { db.exec("DROP TABLE IF EXISTS entries_fts"); } catch {}

  const results: BenchResult[] = [];

  for (const [name, engine] of [
    ["FTS5 + jieba", new Fts5SearchEngine()],
    ["MiniSearch", new MiniSearchEngine()],
  ] as [string, SearchEngine][]) {
    console.log(`⏱  Benchmarking ${name}...`);
    const r = await benchEngine(name, engine);
    results.push(r);
    console.log(
      `   init: ${r.initMs.toFixed(1)}ms | add(100): ${r.addMs.toFixed(2)}ms | search avg: ${r.searchAvgMs.toFixed(3)}ms`
    );
    console.log(
      `   mem: rss Δ${formatMB(r.memAfterInit.rss - r.memBeforeInit.rss)} | heap Δ${formatMB(r.memAfterInit.heapUsed - r.memBeforeInit.heapUsed)} (after init)`
    );
  }

  // ── comparison table ─────────────────────────────────────
  console.log("\n" + "═".repeat(72));
  console.log("  Metric            │  FTS5 + jieba      │  MiniSearch");
  console.log("─".repeat(72));

  const fts5 = results[0]!;
  const mini = results[1]!;
  const row = (label: string, fv: string, mv: string) =>
    console.log(`  ${label.padEnd(18)} │  ${fv.padEnd(18)} │  ${mv}`);

  row("init()", `${fts5.initMs.toFixed(1)} ms`, `${mini.initMs.toFixed(1)} ms`);
  row("add(100)", `${fts5.addMs.toFixed(2)} ms`, `${mini.addMs.toFixed(2)} ms`);
  row("search (avg)", `${fts5.searchAvgMs.toFixed(3)} ms`, `${mini.searchAvgMs.toFixed(3)} ms`);

  // Memory rows
  const fts5RssDelta = fts5.memAfterInit.rss - fts5.memBeforeInit.rss;
  const miniRssDelta = mini.memAfterInit.rss - mini.memBeforeInit.rss;
  const fts5HeapDelta = fts5.memAfterInit.heapUsed - fts5.memBeforeInit.heapUsed;
  const miniHeapDelta = mini.memAfterInit.heapUsed - mini.memBeforeInit.heapUsed;

  row("RSS Δ (init)", formatMB(fts5RssDelta), formatMB(miniRssDelta));
  row("Heap Δ (init)", formatMB(fts5HeapDelta), formatMB(miniHeapDelta));
  row("RSS (total)", formatMB(fts5.memAfterSearch.rss), formatMB(mini.memAfterSearch.rss));
  row("Heap (total)", formatMB(fts5.memAfterSearch.heapUsed), formatMB(mini.memAfterSearch.heapUsed));
  row(
    "init speedup",
    fts5.initMs < mini.initMs
      ? `${(mini.initMs / fts5.initMs).toFixed(1)}× faster`
      : `${(fts5.initMs / mini.initMs).toFixed(1)}× slower`,
    "baseline"
  );
  row(
    "search speedup",
    fts5.searchAvgMs < mini.searchAvgMs
      ? `${(mini.searchAvgMs / fts5.searchAvgMs).toFixed(1)}× faster`
      : `${(fts5.searchAvgMs / mini.searchAvgMs).toFixed(1)}× slower`,
    "baseline"
  );

  console.log("═".repeat(72));

  // ── per-query results ────────────────────────────────────
  console.log("\n📋 Per-query results (total hits):");
  console.log(
    `  ${"Query".padEnd(20)} │  ${"FTS5".padEnd(8)} │  ${"MiniSearch".padEnd(8)}`
  );
  console.log("─".repeat(50));
  for (let i = 0; i < SEARCH_QUERIES.length; i++) {
    const fq = fts5.searchResults[i]!;
    const mq = mini.searchResults[i]!;
    console.log(
      `  ${fq.query.padEnd(20)} │  ${String(fq.total).padEnd(8)} │  ${String(mq.total).padEnd(8)}`
    );
  }
  console.log();
}

main().catch(console.error);
