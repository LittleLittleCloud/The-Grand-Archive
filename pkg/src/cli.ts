/**
 * CLI 工具 — dak search / dak feeds / dak stats
 *
 * 用法:
 *   dak search <query> [options]     搜索 feed 条目
 *   dak feeds [options]              列出 feed 条目
 *   dak stats                        显示索引统计
 *   dak suggest <query>              获取搜索建议
 *   dak help                         显示帮助
 *
 * 搜索选项:
 *   -c, --category <cat>     按分类过滤
 *   -s, --source <src>       按来源过滤
 *   -t, --tag <tag>          按标签过滤 (可多次使用)
 *   -a, --author <author>    按作者过滤
 *       --from <date>        发布时间起始 (YYYY-MM-DD)
 *       --to <date>          发布时间截止 (YYYY-MM-DD)
 *       --title-only         仅搜索标题
 *   -n, --limit <n>          返回条目数量 (默认 20)
 *       --json               以 JSON 格式输出
 *       --content            显示正文摘要
 */

import { createSearchIndex } from "./search.js";
import { getFeeds, getCategories, getSources, getAllTags } from "./feeds.js";
import type { SearchOptions, SearchResult } from "./types.js";

// ── Argument parsing ──

interface ParsedArgs {
  command: string;
  query: string;
  category?: string;
  source?: string;
  tags: string[];
  author?: string;
  dateFrom?: string;
  dateTo?: string;
  titleOnly: boolean;
  limit: number;
  json: boolean;
  showContent: boolean;
}

function parseArgs(argv: string[]): ParsedArgs {
  const args = argv.slice(2); // skip node + script
  const parsed: ParsedArgs = {
    command: "",
    query: "",
    tags: [],
    titleOnly: false,
    limit: 20,
    json: false,
    showContent: false,
  };

  const positionals: string[] = [];
  let i = 0;

  while (i < args.length) {
    const arg = args[i]!;

    if (arg === "-c" || arg === "--category") {
      parsed.category = args[++i];
    } else if (arg === "-s" || arg === "--source") {
      parsed.source = args[++i];
    } else if (arg === "-t" || arg === "--tag") {
      parsed.tags.push(args[++i]!);
    } else if (arg === "-a" || arg === "--author") {
      parsed.author = args[++i];
    } else if (arg === "--from") {
      parsed.dateFrom = args[++i];
    } else if (arg === "--to") {
      parsed.dateTo = args[++i];
    } else if (arg === "--title-only") {
      parsed.titleOnly = true;
    } else if (arg === "-n" || arg === "--limit") {
      parsed.limit = parseInt(args[++i]!, 10) || 20;
    } else if (arg === "--json") {
      parsed.json = true;
    } else if (arg === "--content") {
      parsed.showContent = true;
    } else if (!arg.startsWith("-")) {
      positionals.push(arg);
    }
    i++;
  }

  parsed.command = positionals[0] ?? "help";
  parsed.query = positionals.slice(1).join(" ");

  return parsed;
}

// ── Formatting ──

const COLORS = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
  magenta: "\x1b[35m",
  gray: "\x1b[90m",
};

function formatDate(dateStr: string): string {
  if (!dateStr) return "未知";
  try {
    return new Date(dateStr).toISOString().slice(0, 10);
  } catch {
    return dateStr.slice(0, 10);
  }
}

function truncate(text: string, maxLen: number): string {
  const clean = text.replace(/\n+/g, " ").trim();
  return clean.length > maxLen ? clean.slice(0, maxLen) + "…" : clean;
}

function printResult(r: SearchResult, index: number, showContent: boolean) {
  const { entry, score, matchedFields } = r;
  const date = formatDate(entry.published);
  const scoreStr =
    score !== 1 ? ` ${COLORS.dim}(score: ${score.toFixed(1)})${COLORS.reset}` : "";
  const fieldsStr =
    matchedFields.length > 0
      ? ` ${COLORS.gray}[${matchedFields.join(", ")}]${COLORS.reset}`
      : "";

  console.log(
    `${COLORS.dim}${String(index + 1).padStart(3)}.${COLORS.reset} ` +
      `${COLORS.bold}${entry.title}${COLORS.reset}${scoreStr}${fieldsStr}`
  );
  console.log(
    `     ${COLORS.cyan}${entry.category}${COLORS.reset} | ` +
      `${COLORS.blue}${entry.source}${COLORS.reset} | ` +
      `${COLORS.green}${date}${COLORS.reset}` +
      (entry.tags.length > 0
        ? ` | ${COLORS.yellow}${entry.tags.join(", ")}${COLORS.reset}`
        : "")
  );

  if (entry.link) {
    console.log(`     ${COLORS.dim}${entry.link}${COLORS.reset}`);
  }

  if (showContent && entry.content) {
    console.log(
      `     ${COLORS.gray}${truncate(entry.content, 120)}${COLORS.reset}`
    );
  }

  console.log("");
}

// ── Commands ──

function cmdSearch(parsed: ParsedArgs) {
  const index = createSearchIndex();

  const options: SearchOptions = {
    query: parsed.query || undefined,
    category: parsed.category,
    source: parsed.source,
    tags: parsed.tags.length > 0 ? parsed.tags : undefined,
    author: parsed.author,
    dateFrom: parsed.dateFrom,
    dateTo: parsed.dateTo,
    titleOnly: parsed.titleOnly,
    limit: parsed.limit,
  };

  const results = index.search(options);

  if (parsed.json) {
    console.log(JSON.stringify(results, null, 2));
    return;
  }

  if (results.length === 0) {
    console.log("\n  没有找到匹配的条目。\n");
    return;
  }

  const header = parsed.query
    ? `搜索 "${parsed.query}"`
    : "筛选结果";

  const filterParts: string[] = [];
  if (parsed.category) filterParts.push(`分类=${parsed.category}`);
  if (parsed.source) filterParts.push(`来源=${parsed.source}`);
  if (parsed.tags.length > 0)
    filterParts.push(`标签=${parsed.tags.join(",")}`);
  if (parsed.dateFrom || parsed.dateTo)
    filterParts.push(`时间=${parsed.dateFrom ?? "…"}~${parsed.dateTo ?? "…"}`);

  console.log(
    `\n  ${COLORS.bold}${header}${COLORS.reset}` +
      (filterParts.length > 0
        ? ` ${COLORS.dim}(${filterParts.join(", ")})${COLORS.reset}`
        : "") +
      ` — ${results.length} 条结果\n`
  );

  for (let i = 0; i < results.length; i++) {
    printResult(results[i]!, i, parsed.showContent);
  }
}

function cmdFeeds(parsed: ParsedArgs) {
  // Reuse search with empty query but with filters
  const options: SearchOptions = {
    category: parsed.category,
    source: parsed.source,
    tags: parsed.tags.length > 0 ? parsed.tags : undefined,
    author: parsed.author,
    dateFrom: parsed.dateFrom,
    dateTo: parsed.dateTo,
    limit: parsed.limit,
  };

  const index = createSearchIndex();
  const results = index.search(options);

  if (parsed.json) {
    console.log(JSON.stringify(results.map((r) => r.entry), null, 2));
    return;
  }

  if (results.length === 0) {
    console.log("\n  没有找到条目。\n");
    return;
  }

  console.log(
    `\n  ${COLORS.bold}Feed 条目${COLORS.reset} — 共 ${getFeeds().length} 条，显示 ${results.length} 条\n`
  );

  for (let i = 0; i < results.length; i++) {
    printResult(results[i]!, i, parsed.showContent);
  }
}

function cmdStats() {
  const index = createSearchIndex();
  const stats = index.stats();

  console.log(`
  ${COLORS.bold}大案牍库 — 索引统计${COLORS.reset}

  📊 文档总数:   ${stats.totalDocuments}
  📁 分类 (${stats.categories.length}):  ${stats.categories.join(", ")}
  📡 来源 (${stats.sources.length}):  ${stats.sources.slice(0, 10).join(", ")}${stats.sources.length > 10 ? "…" : ""}
  🏷  标签 (${stats.tags.length}):  ${stats.tags.slice(0, 15).join(", ")}${stats.tags.length > 15 ? "…" : ""}
  📅 时间范围:   ${formatDate(stats.dateRange.earliest)} ~ ${formatDate(stats.dateRange.latest)}
`);
}

function cmdSuggest(parsed: ParsedArgs) {
  if (!parsed.query) {
    console.log("\n  请提供搜索关键词。\n");
    return;
  }

  const index = createSearchIndex();
  const suggestions = index.suggest(parsed.query);

  if (parsed.json) {
    console.log(JSON.stringify(suggestions));
    return;
  }

  if (suggestions.length === 0) {
    console.log("\n  没有建议。\n");
    return;
  }

  console.log(`\n  搜索建议:\n`);
  for (const s of suggestions) {
    console.log(`    • ${s}`);
  }
  console.log("");
}

function printHelp() {
  console.log(`
  ${COLORS.bold}dak${COLORS.reset} — 大案牍库 CLI 搜索工具

  ${COLORS.bold}用法:${COLORS.reset}
    dak search <query> [options]     搜索 feed 条目
    dak feeds [options]              列出 feed 条目
    dak stats                        显示索引统计
    dak suggest <query>              获取搜索建议
    dak help                         显示帮助

  ${COLORS.bold}搜索选项:${COLORS.reset}
    -c, --category <cat>     按分类过滤 (如: finance, tech, news)
    -s, --source <src>       按来源过滤 (如: CNBC, BBC)
    -t, --tag <tag>          按标签过滤 (可多次使用: -t 经济 -t 美国)
    -a, --author <author>    按作者过滤
        --from <date>        发布时间起始 (YYYY-MM-DD)
        --to <date>          发布时间截止 (YYYY-MM-DD)
        --title-only         仅搜索标题
    -n, --limit <n>          返回条目数量 (默认 20)
        --json               以 JSON 格式输出
        --content            显示正文摘要

  ${COLORS.bold}示例:${COLORS.reset}
    dak search "inflation"
    dak search "oil price" -c finance --from 2026-03-01
    dak search "AI" --title-only -n 10
    dak feeds -c tech -n 5
    dak feeds -t 经济 -t 美国 --content
    dak stats
    dak suggest "inflat"
`);
}

// ── Main ──

const parsed = parseArgs(process.argv);

switch (parsed.command) {
  case "search":
  case "s":
    cmdSearch(parsed);
    break;
  case "feeds":
  case "feed":
  case "f":
  case "list":
  case "ls":
    cmdFeeds(parsed);
    break;
  case "stats":
  case "info":
    cmdStats();
    break;
  case "suggest":
  case "ac":
    cmdSuggest(parsed);
    break;
  case "help":
  case "--help":
  case "-h":
  default:
    printHelp();
    break;
}
