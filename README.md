# The Grand Archive

[![npm](https://img.shields.io/npm/v/@littlelittlecloud/dak)](https://www.npmjs.com/package/@littlelittlecloud/dak)
[![npm](https://img.shields.io/npm/v/@littlelittlecloud/dak-cli)](https://www.npmjs.com/package/@littlelittlecloud/dak-cli)
[![GitHub stars](https://img.shields.io/github/stars/LittleLittleCloud/The-Grand-Archive?style=social)](https://github.com/LittleLittleCloud/The-Grand-Archive)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> **The Grand Archive is a tool that gives your AI agent real-time news search across 20+ sources.**

[中文版](README.zh.md)

---

## Quick Start — For AI Agent Users

Add The Grand Archive skills to your Claude project in one command:

```bash
npx skills add LittleLittleCloud/The-Grand-Archive
```

Then tell your Claude: **"Search recent news about tariffs"** — that's it.

Your AI agent can now search, summarize, and analyze 14,000+ live news entries from Bloomberg, AP News, Hacker News, and more.

---

## Quick Start — For Developers

Install the TypeScript SDK:

```bash
npm install @littlelittlecloud/dak
```

```typescript
import { DakClient } from "@littlelittlecloud/dak";

const client = new DakClient({ baseUrl: "https://dak-server.fly.dev" });

const result = await client.search({ q: "tariff", category: "finance", limit: 10 });
console.log(result.results[0].title);
```

Or use the CLI:

```bash
npm install -g @littlelittlecloud/dak-cli
dak search "AI regulation" --category tech
```

---

## Use Cases

- **"Summarize today's finance headlines"** — get a structured digest from Bloomberg, CNBC, MarketWatch, and more
- **"Track cross-source coverage of a topic"** — compare how AP News, Al Jazeera, and BBC cover the same event
- **"Deep-dive analysis with citations"** — pull 30+ articles on a topic, cluster by theme, output a research brief

---

## Features

- **AI-native** — Claude Skills included; your agent searches, filters, and summarizes without extra setup
- **21 live sources** — finance, geopolitics, tech, and social trending, updated every 30 minutes
- **Full-text search** — fuzzy + prefix matching across 14,000+ entries via MiniSearch
- **TypeScript SDK** — typed HTTP client, supports ESM and CJS
- **CLI** — `dak` command for one-liner searches and feed browsing
- **Tiered access** — anonymous (28 days), free (90 days), premium (unlimited)

---

## Sources

| Category | Sources |
|----------|---------|
| **International / Geopolitics** | BBC Chinese · NYT Chinese · Al Jazeera · AP News · Foreign Affairs · The Diplomat · 参考消息 · 人民网 |
| **Finance / Macro** | Bloomberg · CNBC · MarketWatch · 华尔街见闻 · 第一财经 · 财新网 · ZeroHedge · 金十数据 · 雪球 |
| **Social Trending** | Weibo Hot · Zhihu Hot |
| **Tech** | Hacker News |

Full configuration: [`config/sources.yaml`](config/sources.yaml)

---

## Skills (AI Agent Integration)

Two Claude Code / AI Agent skills are included in the `skills/` directory.

### `skills/dak` — Search & Browse

> Search and access feed data from The Grand Archive

Supports full-text search, filtering by category / source / tag / date range.

```
> Search for finance news about tariffs
> Find recent articles about AI with dak
> Look up oil price reports from March 2026
```

**Trigger keywords:** `search`, `find articles`, `dak search`, `dak feeds`

### `skills/dak_summary` — Structured Analysis

> Methodology for structured analysis built on feed data

Three-step core: **Broad Query** → **Cross-Source Analysis** → **Structured Output**

1. **Broad Query** — retrieve widely from 14,000+ entries using multiple keyword passes
2. **Cross-Source Analysis** — dedup, cross-validate, identify patterns (timeline / causation / trends), cluster by theme
3. **Structured Output** — write to a structured summary file

Two key use cases:
- **Daily digest** — run analysis over all feeds for a given day, output a topic-grouped summary
- **Topic deep-dive** — trace a topic across time, produce a chronological event timeline

```
> Summarize today's news
> Analyze how the Iran conflict affects oil and gold prices
> Write a topic summary on recent AI developments
```

**Trigger keywords:** `summarize`, `daily digest`, `analyze [event]`, `write topic summary`

### Install Skills

Recommended — one command:

```bash
npx skills add LittleLittleCloud/The-Grand-Archive
```

Or copy manually:

```bash
cp -r skills/dak /your-project/.claude/skills/dak
cp -r skills/dak_summary /your-project/.claude/skills/dak_summary
npm install -g @littlelittlecloud/dak-cli
```

---

## CLI Reference

The CLI connects to `https://dak-server.fly.dev` by default. Set an API key to unlock premium access:

```bash
export DAK_API_KEY=your-api-key  # required for premium tier (90-day history and higher rate limits)
```

### Search

```bash
dak search "inflation"
dak search "oil price" --category finance --from 2026-03-01
dak search "AI" --limit 10
dak search "tariff" --json
```

### Browse

```bash
dak feeds
dak feeds --category tech --limit 20
dak feeds --source Bloomberg --limit 10
```

### Other

```bash
dak stats
dak suggest "inflat"
```

### Options

| Option | Description |
|--------|-------------|
| `--category <cat>` | Filter by category: `finance` / `news` / `social` / `tech` / `blog` / `podcast` |
| `--source <src>` | Filter by source |
| `--from <date>` | Published after (ISO 8601) |
| `--to <date>` | Published before (ISO 8601) |
| `--limit <n>` | Max results (default 20) |
| `--json` | JSON output |

---

## SDK Reference

```typescript
import { DakClient } from "@littlelittlecloud/dak";

const client = new DakClient({
  baseUrl: "https://dak-server.fly.dev",
  apiKey: "your-api-key", // optional
});

// Search
const result = await client.search({
  q: "inflation",
  category: "finance",
  from: "2026-03-01",
  limit: 20,
});
result.results[0].title;  // article title
result.results[0].score;  // relevance score
result.total;             // total matches
result.tier;              // "anonymous" | "free" | "premium"

// Browse
const feeds = await client.getFeeds({ category: "tech", limit: 10 });
const finance = await client.getFeedsByCategory("finance");
const bloomberg = await client.getFeedsBySource("Bloomberg");

// Single entry
const entry = await client.getFeed("entry-id");

// Stats
const stats = await client.getStats();
stats.total;        // total entry count
stats.byCategory;   // [{ category, count }]
stats.bySource;     // [{ source, count }]
```

### API Methods

| Method | Description |
|--------|-------------|
| `search(params)` | Full-text search with category / source / date / pagination filters |
| `getFeeds(params?)` | Browse entries with multi-dimensional filters |
| `getFeed(id)` | Get single entry by ID |
| `getFeedsByCategory(cat)` | Get entries by category |
| `getFeedsBySource(src)` | Get entries by source |
| `getStats()` | Get index statistics |

---

## Technical Details

### Search Capabilities

Built on [MiniSearch](https://lucaong.github.io/minisearch/) — full-text search across 14,000+ entries:

- **Title search** — fast matching (364ms index build, low memory)
- **Fuzzy matching** — ~20% character distance tolerance (`inflaton` → `inflation`)
- **Prefix matching** — `inflat` matches `inflation`, `inflationary`
- **Multi-dimensional filters** — category, source, date range
- **Tier limits** — anonymous (28 days), free (90 days), premium (unlimited)

### Architecture

```
┌─────────────┐    ┌─────────────────┐    ┌──────────────┐
│  RSS Feeds  │───▶│ Ingestion Worker│───▶│   SQLite DB  │
└─────────────┘    └─────────────────┘    └──────┬───────┘
                                                 │
                          ┌──────────────────────┤
                          ▼                      ▼
                   ┌─────────────┐       ┌──────────────┐
                   │  Hono API   │       │  MiniSearch  │
                   │   Server    │       │    Index     │
                   └──────┬──────┘       └──────────────┘
                          │
            ┌─────────────┼─────────────┐
            ▼             ▼             ▼
      ┌──────────┐ ┌──────────┐ ┌──────────┐
      │   SDK    │ │   CLI    │ │   Web UI │
      └──────────┘ └──────────┘ └──────────┘
```

### npm Packages

| Package | Description |
|---------|-------------|
| [`@littlelittlecloud/dak`](https://www.npmjs.com/package/@littlelittlecloud/dak) | TypeScript SDK — HTTP client, ESM / CJS |
| [`@littlelittlecloud/dak-cli`](https://www.npmjs.com/package/@littlelittlecloud/dak-cli) | CLI tool — `dak` command, zero-dependency single-file bundle |

### Project Structure

```
packages/
  contract/          # Zod schemas, types, route constants (workspace-only)
  server/            # Hono API server + SQLite + MiniSearch
  sdk/               # @littlelittlecloud/dak — HTTP client SDK
  cli/               # @littlelittlecloud/dak-cli — CLI tool
  ingestion-worker/  # RSS fetch worker (every 30 minutes)
  ui/                # Web dashboard
```

### Local Development

```bash
bun install

# Start API server
cd packages/server && bun run dev

# Run ingestion worker (one-shot mode)
cd packages/ingestion-worker && ONCE=1 bun run src/index.ts

# CLI development
cd packages/cli && bun run src/index.ts search "test"
```

### RSS Feed Collection

```bash
bun run fetch              # fetch all enabled sources
bun run fetch finance      # fetch only finance category
bun run list               # list saved entries
bun run sources            # view all sources
```

### Adding a Source

Edit `config/sources.yaml`:

```yaml
- name: Source Name
  url: "{{RSSHUB_BASE_URL}}/example/route"
  category: tech
  enabled: true
  fetch_interval: 3600
  tags: [tag1, tag2]
  description: Short description
```

### Building npm Packages

```bash
cd packages/sdk && bun run build
cd packages/cli && bun run build
```

### Deployment

Server and Worker are deployed on Fly.io (Tokyo nrt):

```bash
cd packages/server && fly deploy
cd packages/ingestion-worker && fly deploy
```

### Dashboard

```bash
bun run dev     # development server
bun run build   # production build
bun run deploy  # deploy to GitHub Pages
```

### CI/CD

| Workflow | Trigger | Action |
|----------|---------|--------|
| `fetch-feeds` | Every 30 min / manual | Fetch RSS → commit new feed files |
| `publish-dak` | After feeds update / manual | Build and publish `@littlelittlecloud/dak` + `@littlelittlecloud/dak-cli` to npm |
| `deploy` | Manual | Build and deploy Dashboard to GitHub Pages |

---

## License

MIT
