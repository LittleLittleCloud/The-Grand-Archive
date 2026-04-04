````skill
---
name: dak
description: Use the dak package and CLI to search, filter, and access feed entries from 大案牍库. Covers keyword search, multi-dimensional filtering (category, source, tags, author, date range), JSON output, and programmatic API usage. Triggers on "search feeds", "搜索", "查找文章", "dak search", "dak feeds", "用dak查".
version: 0.1.0
---

# dak Skill

Search and access 大案牍库 feed entries via the `dak` CLI or programmatic API.

## Overview

`dak` is an npm package (`pkg/`) that bundles all feed entries into a searchable index powered by MiniSearch. It provides:

- **9700+ feed entries** from finance, news, social, tech categories
- **Full-text search** across title + content (title boosted 3×)
- **Multi-dimensional filtering**: category, source, tags, author, language, date range
- **Fuzzy matching + prefix matching** built-in
- **CLI tool** for terminal usage with human-readable or JSON output
- **Programmatic API** for use in scripts and other tools

## CLI Reference

After `npm link` in `pkg/`, the `dak` command is globally available:

```bash
dak <command> [options]
```

### Commands

| Command | Description |
|---------|-------------|
| `search <query> [options]` | Full-text search with optional filters |
| `feeds [options]` | List/filter feed entries (no keyword needed) |
| `stats` | Show index statistics (total docs, categories, sources, tags, date range) |
| `suggest <query>` | Get autocomplete suggestions |
| `help` | Show help |

### Options

| Option | Short | Description |
|--------|-------|-------------|
| `--category <cat>` | `-c` | Filter by category: `finance`, `news`, `social`, `tech` |
| `--source <src>` | `-s` | Filter by source name (partial match, e.g. `CNBC`, `Bloomberg`) |
| `--tag <tag>` | `-t` | Filter by tag (repeatable: `-t 经济 -t 美国`) |
| `--author <author>` | `-a` | Filter by author (partial match) |
| `--from <date>` | | Published date start, inclusive (YYYY-MM-DD) |
| `--to <date>` | | Published date end, inclusive (YYYY-MM-DD) |
| `--title-only` | | Search title field only (higher precision) |
| `--limit <n>` | `-n` | Max results (default 20) |
| `--json` | | Output as JSON array (for piping/parsing) |
| `--content` | | Show content snippet in human-readable output |

### Example Commands

```bash
# Full-text search
dak search "inflation"

# Search within a category + date range
dak search "oil price" -c finance --from 2026-03-01

# Title-only search
dak search "AI" --title-only -n 10

# Filter by tags (no keyword needed — use feeds command)
dak feeds -t 中东 -t 地缘政治 --from 2026-03-01 -n 50

# Filter by date range, get all entries for a day
dak feeds --from 2026-04-02 --to 2026-04-02 --json -n 500

# Filter by source
dak feeds -s Bloomberg -n 20

# JSON output for programmatic use
dak search "tariff" --json -n 50

# Stats overview
dak stats

# Autocomplete suggestions
dak suggest "inflat"
```

## JSON Output Schema

When `--json` is used, output is a JSON array of `SearchResult` objects:

```jsonc
[
  {
    "entry": {
      "id": "7705eefeb6d0",           // unique hash
      "title": "U.S. payrolls...",     // article title
      "source": "CNBC Economy",        // source name
      "sourceUrl": "https://...",      // source RSS URL
      "link": "https://...",           // article URL
      "author": "",                    // author
      "published": "2026-03-06T...",   // ISO date
      "fetched": "2026-03-20T...",     // ISO date
      "category": "finance",           // category ID
      "tags": ["经济", "美国"],         // tag array
      "language": "",                  // language code
      "guid": "108274719",            // RSS GUID
      "filename": "2026-03-06_U.S._payrolls_..._7705eefeb6d0.md",
      "content": "Full markdown body..." // complete article text
    },
    "score": 35.5,                     // relevance score (higher = better)
    "matchedFields": ["title", "content"]  // which fields matched
  }
]
```

**Key fields for downstream use:**
- `entry.filename` → can reconstruct the wikilink path: `feeds/{category}/{filename}`
- `entry.content` → full Markdown body, useful for summarization
- `entry.published` → canonical publish time
- `score` → only meaningful when a search query is provided; without query, all scores are 1

## Search Behavior

- **With query**: Results ranked by MiniSearch relevance score. Title matches weighted 3×, tags 2×, source 1.5×, content 1×.
- **Without query** (filters only): Results sorted by published date descending.
- **Fuzzy matching**: Tolerates ~20% character distance (e.g. "inflaton" finds "inflation").
- **Prefix matching**: Partial words match (e.g. "inflat" matches "inflation", "inflationary").
- **Filters are AND-combined**: `search "oil" -c finance --from 2026-03-01` = keyword AND category AND date.
- **Tags filter uses OR**: `-t 经济 -t 美国` matches entries with either tag.

## Available Categories

| ID | Content |
|----|---------|
| `finance` | Financial news, markets, macro (Bloomberg, CNBC, MarketWatch, ZeroHedge, 华尔街见闻) |
| `news` | International news (AP, Al Jazeera, BBC 中文, Foreign Affairs) |
| `social` | Chinese social media (知乎热榜, 微博) |
| `tech` | Tech blogs, Hacker News |

## Programmatic API

```typescript
import { getFeeds, getFeedsByCategory, createSearchIndex } from "dak";

// Access feeds
const all = getFeeds();
const finance = getFeedsByCategory("finance");

// Search
const index = createSearchIndex();
const results = index.search({ query: "inflation", category: "finance", limit: 20 });
results[0].entry.title;   // article title
results[0].entry.content; // full body
results[0].score;         // relevance score

// Autocomplete
index.suggest("inflat"); // ["inflation", "inflationary", ...]

// Stats
index.stats(); // { totalDocuments, categories, sources, tags, dateRange }
```

## Rebuilding Data

When feeds are updated (after `bun run fetch`), rebuild the search data:

```bash
cd pkg && bun run build:data && bun run build:ts
```

Or in one step:
```bash
cd pkg && bun run build
```

## Tips

- For **daily summary** workflows: use `feeds --from --to --json -n 500` to get all posts for a specific date.
- For **topic summary** workflows: use `search "keyword" --json -n 100` with optional category/date filters.
- When results are large, pipe through `jq` for further filtering: `dak search "oil" --json | jq '[.[] | select(.score > 20)]'`
- Use `--title-only` when you want precision over recall (avoids matching incidental keyword mentions in body text).
- Combine Chinese and English keywords with separate searches when covering bilingual topics.

````
