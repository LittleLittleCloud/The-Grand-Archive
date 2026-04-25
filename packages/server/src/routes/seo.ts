import { Hono } from "hono";
import { getDb } from "../db/client";
import { readFileSync } from "fs";

export const seoRoutes = new Hono();

/* ── robots.txt ── */
seoRoutes.get("/robots.txt", (c) => {
  const body = [
    "User-agent: *",
    "Allow: /",
    "",
    "Sitemap: https://dak-news.com/sitemap.xml",
  ].join("\n");
  return c.text(body, 200, { "Content-Type": "text/plain" });
});

/* ── AGENTS.md — zero-install integration guide for AI agents ── */
const agentsHandler = (c: any) => {
  const proto = c.req.header("x-forwarded-proto") ?? (c.req.url.startsWith("https") ? "https" : "http");
  const host = c.req.header("host") ?? "dak-news.com";
  const base = `${proto}://${host}`;
  const md = `# 大案牍库 (The Grand Archive) — Agent Integration Guide

> **Base URL:** \`${base}\`
>
> A real-time news database tracking 20+ authoritative sources across finance, geopolitics, tech, and social trending. Updated every 30 minutes.

## Quick Start

No SDK or CLI installation required. Just use HTTP requests.

\`\`\`bash
# Search for news
curl "${base}/api/search?q=tariff&limit=5"

# Browse recent entries
curl "${base}/api/feeds?category=finance&limit=10"

# Get stats
curl "${base}/api/stats"
\`\`\`

## API Reference

### GET /api/search

Full-text search across all entries. Supports fuzzy and prefix matching.

**Parameters:**

| Parameter  | Type   | Required | Description |
|-----------|--------|----------|-------------|
| q         | string | ✅       | Search query (min 1 char) |
| category  | string | optional | Filter: \`finance\`, \`news\`, \`tech\`, \`social\` |
| source    | string | optional | Filter by source name (e.g. \`Bloomberg\`, \`CNBC\`) |
| from      | string | optional | Start date (ISO 8601, e.g. \`2026-04-01\`) |
| to        | string | optional | End date (ISO 8601) |
| limit     | number | optional | Results per page (1–100, default 20) |
| offset    | number | optional | Pagination offset (default 0) |

**Example:**

\`\`\`bash
curl "${base}/api/search?q=oil+prices&category=finance&from=2026-04-01&limit=10"
\`\`\`

**Response:**

\`\`\`json
{
  "results": [
    {
      "id": "entry-id",
      "title": "Oil prices surge amid Middle East tensions",
      "source": "Bloomberg",
      "category": "finance",
      "published": "2026-04-20T08:30:00Z",
      "score": 8.4
    }
  ],
  "total": 142,
  "query": "oil prices",
  "tier": "anonymous",
  "tierCutoff": "2026-03-28"
}
\`\`\`

### GET /api/feeds

Browse entries with filtering. No search query required.

**Parameters:**

| Parameter  | Type   | Required | Description |
|-----------|--------|----------|-------------|
| category  | string | optional | Filter by category |
| source    | string | optional | Filter by source |
| from      | string | optional | Start date (ISO 8601) |
| to        | string | optional | End date (ISO 8601) |
| limit     | number | optional | Results per page (1–100, default 20) |
| offset    | number | optional | Pagination offset (default 0) |

**Example:**

\`\`\`bash
curl "${base}/api/feeds?category=tech&limit=5"
\`\`\`

**Response:**

\`\`\`json
{
  "entries": [
    {
      "id": "entry-id",
      "title": "Article title",
      "content": "Full article content...",
      "url": "https://original-source.com/article",
      "source": "Hacker News",
      "category": "tech",
      "tags": ["AI", "startup"],
      "author": "author-name",
      "language": "en",
      "published": "2026-04-20T10:00:00Z"
    }
  ],
  "total": 500
}
\`\`\`

### GET /api/feeds/:id

Get a single entry by ID.

\`\`\`bash
curl "${base}/api/feeds/ENTRY_ID"
\`\`\`

### GET /api/stats

Get database statistics.

\`\`\`bash
curl "${base}/api/stats"
\`\`\`

**Response:**

\`\`\`json
{
  "total": 38254,
  "byCategory": [
    { "category": "finance", "count": 15000 },
    { "category": "news", "count": 12000 }
  ],
  "bySource": [
    { "source": "Bloomberg", "count": 3500 },
    { "source": "CNBC", "count": 2800 }
  ],
  "lastUpdated": "2026-04-25T12:00:00Z"
}
\`\`\`

### GET /api/feeds/status

Get per-source ingestion status with daily activity bins.

## Access Tiers

| Tier       | History Window | Rate Limit     | Auth Required |
|-----------|---------------|----------------|---------------|
| Anonymous  | 28 days       | 10 req/min     | No            |
| Free       | 90 days       | 60 req/min     | API Key or session |
| Premium    | Unlimited     | 120 req/min    | API Key or session |

### Authentication

**Anonymous:** No headers needed. Limited to recent 28 days.

**API Key:** Sign up at [${host}/signup](${base}/signup), then create an API key at [${host}/api-keys](${base}/api-keys). Pass it via header:

\`\`\`bash
curl -H "Authorization: Bearer YOUR_API_KEY" "${base}/api/search?q=inflation"
\`\`\`

### Rate Limit Headers

Every API response includes:

- \`X-RateLimit-Limit\` — max requests per minute
- \`X-RateLimit-Remaining\` — remaining requests this window
- \`X-RateLimit-Reset\` — Unix timestamp when the window resets

If rate-limited, you receive HTTP 429 with a JSON body.

## Available Sources

**Finance / Macro:** Bloomberg, CNBC, MarketWatch, 华尔街见闻, 第一财经, 财新网, ZeroHedge, 金十数据, 雪球

**International / Geopolitics:** BBC Chinese, NYT Chinese, Al Jazeera, AP News, Foreign Affairs, The Diplomat, 参考消息, 人民网

**Tech:** Hacker News

**Social Trending:** Weibo Hot, Zhihu Hot

## Categories

\`finance\` \`news\` \`tech\` \`social\`

## Tips for AI Agents

1. **Start with stats** — call \`/api/stats\` first to understand available data volume and sources.
2. **Use date filters** — narrow results with \`from\` and \`to\` to stay within your tier's history window.
3. **Combine filters** — use \`category\` + \`source\` + date range for precise queries.
4. **Paginate** — use \`offset\` to retrieve more than the first page of results.
5. **Check tier info** — the \`tier\` and \`tierCutoff\` fields in search responses tell you your current access level.
`;
  return c.text(md, 200, {
    "Content-Type": "text/markdown; charset=utf-8",
    "Cache-Control": "public, max-age=3600",
  });
};
seoRoutes.get("/AGENTS.md", agentsHandler);
seoRoutes.get("/agents.md", agentsHandler);

/* ── sitemap.xml ── */
seoRoutes.get("/sitemap.xml", (c) => {
  const db = getDb();

  // Static pages
  const staticPages = [
    { loc: "/", priority: "1.0", changefreq: "hourly" },
    { loc: "/search", priority: "0.9", changefreq: "hourly" },
    { loc: "/feeds", priority: "0.8", changefreq: "daily" },
  ];

  // Entry pages — most recent 5000 entries (sitemap size limit)
  const entries = db
    .query<{ id: string; published: string }, []>(
      `SELECT id, published FROM entries ORDER BY published DESC LIMIT 5000`
    )
    .all();

  const urls = [
    ...staticPages.map(
      (p) =>
        `  <url><loc>https://dak-news.com${p.loc}</loc><changefreq>${p.changefreq}</changefreq><priority>${p.priority}</priority></url>`
    ),
    ...entries.map(
      (e: { id: string; published: string }) =>
        `  <url><loc>https://dak-news.com/entry/${encodeURIComponent(e.id)}</loc><lastmod>${e.published.slice(0, 10)}</lastmod><changefreq>never</changefreq><priority>0.6</priority></url>`
    ),
  ];

  const xml = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
    ...urls,
    `</urlset>`,
  ].join("\n");

  return c.text(xml, 200, { "Content-Type": "application/xml" });
});

/* ── Server-side meta injection for /entry/:id ── */
let indexHtml: string | null = null;

function getIndexHtml(staticDir: string): string {
  if (!indexHtml) {
    indexHtml = readFileSync(staticDir + "/index.html", "utf-8");
  }
  return indexHtml!;
}

/**
 * For entry pages, inject <title> + <meta> + OG tags + JSON-LD into the HTML
 * so crawlers see meaningful content without JS execution.
 * Also injects SEO-optimized meta for /search and /feeds pages.
 */
export function entryMetaMiddleware(staticDir: string) {
  const app = new Hono();

  /* /entry/:id — full meta + JSON-LD */
  app.get("/entry/:id", (c) => {
    const id = decodeURIComponent(c.req.param("id"));
    const db = getDb();

    const entry = db
      .query<
        { title: string; source: string; category: string; published: string; content: string | null },
        [string]
      >("SELECT title, source, category, published, content FROM entries WHERE id = ?")
      .get(id);

    let html = getIndexHtml(staticDir);

    if (entry) {
      const title = escapeHtml(entry.title) + " — 大案牍库";
      const description = escapeHtml(
        (entry.content || entry.title).slice(0, 200).replace(/\s+/g, " ")
      );
      const url = `https://dak-news.com/entry/${encodeURIComponent(id)}`;

      const jsonLd = JSON.stringify({
        "@context": "https://schema.org",
        "@type": "NewsArticle",
        "headline": entry.title,
        "description": (entry.content || entry.title).slice(0, 200),
        "url": `https://dak-news.com/entry/${encodeURIComponent(id)}`,
        "datePublished": entry.published,
        "publisher": {
          "@type": "Organization",
          "name": "大案牍库",
          "url": "https://dak-news.com",
        },
        "articleSection": entry.category,
        "sourceOrganization": { "@type": "Organization", "name": entry.source },
      });

      const metaTags = [
        `<title>${title}</title>`,
        `<meta name="description" content="${description}">`,
        `<link rel="canonical" href="${url}">`,
        `<meta property="og:title" content="${title}">`,
        `<meta property="og:description" content="${description}">`,
        `<meta property="og:url" content="${url}">`,
        `<meta property="og:type" content="article">`,
        `<meta property="og:site_name" content="大案牍库 The Grand Archive">`,
        `<meta property="article:published_time" content="${entry.published}">`,
        `<meta property="article:section" content="${escapeHtml(entry.category)}">`,
        `<meta name="twitter:card" content="summary">`,
        `<meta name="twitter:title" content="${title}">`,
        `<meta name="twitter:description" content="${description}">`,
        `<script type="application/ld+json">${jsonLd}</script>`,
      ].join("\n    ");

      html = html.replace(
        /<!-- SEO:START -->[\s\S]*?<!-- SEO:END -->/,
        metaTags
      );
    }

    return c.html(html);
  });

  /* /search — SEO meta for search page */
  app.get("/search", (c) => {
    let html = getIndexHtml(staticDir);
    const metaTags = [
      `<title>搜索新闻 — 大案牍库 AI 新闻聚合</title>`,
      `<meta name="description" content="在大案牍库中全文搜索 38,000+ 条新闻。支持按分类、来源、日期过滤，覆盖财经、地缘政治、科技等领域。">`,
      `<link rel="canonical" href="https://dak-news.com/search">`,
      `<meta property="og:title" content="搜索新闻 — 大案牍库 AI 新闻聚合">`,
      `<meta property="og:description" content="在大案牍库中全文搜索 38,000+ 条新闻。支持按分类、来源、日期过滤，覆盖财经、地缘政治、科技等领域。">`,
      `<meta property="og:url" content="https://dak-news.com/search">`,
      `<meta property="og:type" content="website">`,
      `<meta property="og:site_name" content="大案牍库 The Grand Archive">`,
      `<meta name="twitter:card" content="summary">`,
      `<meta name="twitter:title" content="搜索新闻 — 大案牍库">`,
      `<meta name="twitter:description" content="在大案牍库中全文搜索 38,000+ 条新闻">`,
    ].join("\n    ");
    html = html.replace(/<!-- SEO:START -->[\s\S]*?<!-- SEO:END -->/, metaTags);
    return c.html(html);
  });

  /* /feeds — SEO meta for feeds page */
  app.get("/feeds", (c) => {
    let html = getIndexHtml(staticDir);
    const metaTags = [
      `<title>信息源列表 — 大案牍库 AI 新闻聚合</title>`,
      `<meta name="description" content="大案牍库追踪的 20+ 权威信息源：Bloomberg、CNBC、华尔街见闻、BBC Chinese、Hacker News 等，每 30 分钟更新。">`,
      `<link rel="canonical" href="https://dak-news.com/feeds">`,
      `<meta property="og:title" content="信息源列表 — 大案牍库 AI 新闻聚合">`,
      `<meta property="og:description" content="大案牍库追踪的 20+ 权威信息源：Bloomberg、CNBC、华尔街见闻、BBC Chinese、Hacker News 等">`,
      `<meta property="og:url" content="https://dak-news.com/feeds">`,
      `<meta property="og:type" content="website">`,
      `<meta property="og:site_name" content="大案牍库 The Grand Archive">`,
      `<meta name="twitter:card" content="summary">`,
      `<meta name="twitter:title" content="信息源列表 — 大案牍库">`,
      `<meta name="twitter:description" content="大案牍库追踪的 20+ 权威信息源，每 30 分钟更新">`,
    ].join("\n    ");
    html = html.replace(/<!-- SEO:START -->[\s\S]*?<!-- SEO:END -->/, metaTags);
    return c.html(html);
  });

  return app;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
