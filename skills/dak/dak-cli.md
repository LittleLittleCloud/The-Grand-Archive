# dak_cli — 搜索与浏览

Search and access 大案牍库 feed entries via the `dak` CLI or TypeScript SDK. Both connect to the dak-server API over HTTP.

## Overview

`dak` is a **server-connected** system:

- **dak-server** — Hono API server with SQLite + MiniSearch, 14,000+ feed entries
- **`@littlelittlecloud/dak`** — TypeScript SDK (HTTP client), npm package
- **`@littlelittlecloud/dak-cli`** — CLI tool (`dak` command), npm package

Data is stored server-side and updated every 30 minutes by an ingestion worker. No local data bundling needed.

## Setup

```bash
# Install CLI globally
npm install -g @littlelittlecloud/dak-cli

# Configure server URL (default: http://localhost:3000)
export DAK_SERVER_URL=https://dak-news.com
export DAK_API_KEY=your-api-key  # optional, for authenticated access
```

## CLI Reference

```bash
dak <command> [options]
```

### Commands

| Command | Description |
|---------|-------------|
| `search <query> [options]` | Full-text search with optional filters |
| `feeds [options]` | List/filter feed entries |
| `stats` | Show index statistics (total entries, categories, sources) |
| `suggest <query>` | Get search suggestions |
| `help` | Show help |

### Options

| Option | Description |
|--------|-------------|
| `--category <cat>` | Filter by category: `finance`, `news`, `social`, `tech`, `blog`, `podcast` |
| `--source <src>` | Filter by source name |
| `--from <date>` | Published date start (ISO 8601) |
| `--to <date>` | Published date end (ISO 8601) |
| `--limit <n>` | Max results (default 20, max 100) |
| `--json` | Output as JSON (for piping/parsing) |

### Example Commands

```bash
# Full-text search
dak search "inflation"

# Search within a category + date range
dak search "oil price" --category finance --from 2026-03-01

# Limit results
dak search "AI" --limit 10

# List entries by date range
dak feeds --from 2026-04-02 --to 2026-04-02 --json --limit 100

# Filter by source
dak feeds --source Bloomberg --limit 20

# JSON output for programmatic use
dak search "tariff" --json --limit 50

# Stats overview
dak stats

# Search suggestions
dak suggest "inflat"
```

## JSON Output Schema

### Search Response (`--json`)

```jsonc
{
  "results": [
    {
      "id": "7705eefeb6d0",
      "title": "U.S. payrolls...",
      "source": "CNBC Economy",
      "category": "finance",
      "published": "2026-03-06T...",
      "score": 35.5
    }
  ],
  "total": 42,
  "query": "inflation",
  "tier": "anonymous",       // "anonymous" | "free" | "premium"
  "tierCutoff": "2026-03-12" // null if no restriction
}
```

### Feeds Response (`--json`)

```jsonc
{
  "entries": [
    {
      "id": "7705eefeb6d0",
      "title": "U.S. payrolls...",
      "content": "Full markdown body...",
      "url": "https://...",
      "source": "CNBC Economy",
      "category": "finance",
      "tags": ["经济", "美国"],
      "author": null,
      "language": "en",
      "published": "2026-03-06T..."
    }
  ],
  "total": 14372
}
```

**Key fields for downstream use:**
- `content` → full Markdown body (available in feeds response), useful for summarization
- `url` → original article URL, use as reference link
- `published` → canonical publish time
- `score` → relevance score (search results only, higher = better)

### Tier System

| Tier | Access |
|------|--------|
| `anonymous` | Last 28 days only |
| `free` | Last 90 days |
| `premium` | Full archive |

When tier restriction applies, the CLI shows: `⚠ Results limited to entries after {date} ({tier} tier)`.

## Search Behavior

- **With query**: Results ranked by MiniSearch relevance score (title-only index for performance).
- **Without query** (filters only via `feeds`): Results sorted by published date descending.
- **Fuzzy matching**: Tolerates ~20% character distance (e.g. "inflaton" finds "inflation").
- **Prefix matching**: Partial words match (e.g. "inflat" matches "inflation", "inflationary").
- **Filters are AND-combined**: `search "oil" --category finance --from 2026-03-01` = keyword AND category AND date.

## Available Categories

| ID | Content |
|----|---------|
| `finance` | Financial news, markets, macro (Bloomberg, CNBC, MarketWatch, ZeroHedge, 华尔街见闻) |
| `news` | International news (AP, Al Jazeera, BBC 中文, Foreign Affairs) |
| `social` | Chinese social media (知乎热榜, 微博) |
| `tech` | Tech blogs, Hacker News |
| `blog` | Blog posts |
| `podcast` | Podcast entries |

## TypeScript SDK

```typescript
import { DakClient } from "@littlelittlecloud/dak";

const client = new DakClient({
  baseUrl: "https://dak-news.com",
  apiKey: "your-api-key", // optional
});

// Search
const result = await client.search({ q: "inflation", category: "finance", limit: 20 });
result.results[0].title;
result.results[0].score;
result.total;
result.tier;

// Browse feeds
const feeds = await client.getFeeds({ category: "tech", limit: 10 });
feeds.entries[0].title;
feeds.entries[0].content;

// By category / source
const finance = await client.getFeedsByCategory("finance");
const bloomberg = await client.getFeedsBySource("Bloomberg");

// Single entry
const entry = await client.getFeed("entry-id");

// Stats
const stats = await client.getStats();
stats.total;        // total entries
stats.byCategory;   // [{ category, count }]
stats.bySource;     // [{ source, count }]
```
