import { Hono } from "hono";
import { swaggerUI } from "@hono/swagger-ui";
import type { HonoEnv } from "../types";

export const seoRoutes = new Hono<HonoEnv>();

/* ── robots.txt ── */
seoRoutes.get("/robots.txt", (c) => {
  const body = [
    "User-agent: *",
    "Allow: /",
    "Disallow: /entry/",
    "",
    "Sitemap: https://dak-news.com/sitemap.xml",
  ].join("\n");
  return c.text(body, 200, { "Content-Type": "text/plain" });
});

/* ── llms.txt ── */
seoRoutes.get("/llms.txt", (c) => {
  const proto = c.req.header("x-forwarded-proto") ?? (c.req.url.startsWith("https") ? "https" : "http");
  const host = c.req.header("host") ?? "dak-news.com";
  const base = `${proto}://${host}`;
  const md = [
    `# 大案牍库 (The Grand Archive)`,
    `> A real-time news database tracking 20+ authoritative sources across finance, geopolitics, tech, and social trending.`,
    ``,
    `For API reference, endpoints, and how to query this database, see our Agent Integration Guide:`,
    `[${base}/AGENTS.md](${base}/AGENTS.md)`,
    ``,
    `Agents can also publish their own shareable newspaper-style digests (auth required).`,
    `Fetch the exact content format at [${base}/api/digests/schema](${base}/api/digests/schema), then POST to ${base}/api/digests. See the guide above for details.`
  ].join("\n");
  return c.text(md, 200, { "Content-Type": "text/plain; charset=utf-8" });
});

/* ── Swagger UI (Human-readable OpenAPI docs) ── */
seoRoutes.get("/docs", swaggerUI({ url: "/openapi.json" }));

/* ── Markdown Export for LLMs (GEO) ── */
seoRoutes.get("/entry/:id", async (c, next) => {
  const rawId = decodeURIComponent(c.req.param("id"));
  if (!rawId.endsWith(".md")) {
    return next();
  }
  const id = rawId.slice(0, -3);

  const entry = await c.env.DB
    .prepare("SELECT title, source, category, published, content, url FROM entries WHERE id = ?")
    .bind(id)
    .first<{ title: string; source: string; category: string; published: string; content: string | null; url: string }>();

  if (!entry) {
    return c.text("Entry not found", 404);
  }

  const md = [
    `# ${entry.title}`,
    ``,
    `**Source:** ${entry.source} | **Category:** ${entry.category} | **Published:** ${entry.published}`,
    `**Original URL:** ${entry.url}`,
    ``,
    entry.content || "*No content available*"
  ].join("\n");

  return c.text(md, 200, {
    "Content-Type": "text/markdown; charset=utf-8",
    "Cache-Control": "public, max-age=3600"
  });
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

Every operation this API supports — search, browsing, stats — is a plain HTTP GET. Use \`curl\` (or your HTTP client's direct equivalent) against the REST endpoints below, building the exact query string you need from the parameter tables.

> **If you are an LLM / AI agent, set the \`llm.agent: true\` request header on every call.** This helps us understand automated usage. Human-driven clients should send \`llm.agent: false\` (or omit the header).

\`\`\`bash
# Search for news (identify as an LLM agent)
curl -H "llm.agent: true" "${base}/api/search?q=tariff&limit=5"

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

Build your own query string with the same shape — e.g. for \`q=AI\` over the last week:

\`\`\`bash
curl "${base}/api/search?q=AI&from=2026-07-19&to=2026-07-26&limit=20"
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

Note: \`/api/search\` results do not include \`url\` or \`content\`. To get the article link and full body, call \`/api/feeds/:id\` with the \`id\` from a search result.

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

Get a single entry by ID, including its full \`content\` and source \`url\`.

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

## Publishing Digests

You can publish your own newspaper-style **digest** — a complete, structured edition your agent authors from any material — and get a shareable public link. No server-side LLM is involved: you submit finished, schema-valid content; the API validates, renders, and stores it. **Auth required** (Bearer API key or session).

Digests are **private by default**. Sharing one exposes it (link-only) at \`${base}/d/{shareId}\`.

### GET /api/digests/schema

Returns the exact \`content\` format plus a worked example. Fetch this first so you emit a valid body. The machine-readable schema also lives in [${base}/openapi.json](${base}/openapi.json) (\`UserDigestCreateRequest\`).

\`\`\`bash
curl "${base}/api/digests/schema"
\`\`\`

### POST /api/digests

Create a digest. Body: \`{ lang, date?, content }\` — \`lang\` is \`en\` or \`zh\`; \`date\` is \`YYYY-MM-DD\` (defaults to today); \`content\` must match the DigestContent schema.

\`\`\`bash
curl -X POST "${base}/api/digests" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "llm.agent: true" -H "Content-Type: application/json" \\
  -d '{"lang":"en","date":"2026-08-07","content":{
        "title":"My Front Page",
        "standfirst":"A one-paragraph lead.",
        "highlights":["First point","Second point"],
        "sections":[{"heading":"World","items":[
          {"text":"An attributed point.","source":"Reuters","url":"https://example.com/story"}
        ]}]
      }}'
\`\`\`

Returns the created digest, including its \`id\` and \`shareId\` (a bad body returns HTTP 400 with the validation error).

### Manage & share

- \`GET /api/digests\` — list your digests.
- \`GET /api/digests/{id}\` — read one of yours.
- \`PATCH /api/digests/{id}\` — update \`content\`, \`lang\`, \`date\`, or \`visibility\`.
- \`POST /api/digests/{id}/share\` — body \`{"visibility":"public"}\` to publish (or \`"private"\` to unpublish). Public digests are readable at \`GET /api/digests/public/{shareId}\`.
- \`DELETE /api/digests/{id}\` — delete one of yours.

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
curl -H "Authorization: Bearer YOUR_API_KEY" -H "llm.agent: true" "${base}/api/search?q=inflation"
\`\`\`

### Identifying LLM Agents

So we can measure how much traffic is automated, **every request made by an LLM / AI agent must include the header \`llm.agent: true\`.** Requests originating from a human should use \`llm.agent: false\` or omit the header entirely. This header is purely for analytics and does not affect your access tier or rate limit.

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

1. **Call the REST endpoints directly with \`curl\`.** No installation, no client library, no CLI — just an HTTP GET with the right query string.
2. **Always send \`llm.agent: true\`** — include this header on every request so your automated usage is counted correctly.
3. **Start with stats** — call \`/api/stats\` first to understand available data volume and sources.
4. **Use date filters** — narrow results with \`from\` and \`to\` to stay within your tier's history window.
5. **Combine filters** — use \`category\` + \`source\` + date range for precise queries.
6. **Paginate** — use \`offset\` to retrieve more than the first page of results.
7. **Check tier info** — the \`tier\` and \`tierCutoff\` fields in search responses tell you your current access level.
8. **Get full content via \`/api/feeds/:id\`** — \`/api/search\` returns lightweight results without \`url\`/\`content\`; fetch each \`id\` you need via \`/api/feeds/:id\` for the article link and body.
`;
  return c.text(md, 200, {
    "Content-Type": "text/markdown; charset=utf-8",
    "Cache-Control": "public, max-age=3600",
  });
};
seoRoutes.get("/AGENTS.md", agentsHandler);
seoRoutes.get("/agents.md", agentsHandler);

/* ── sitemap.xml ── */
seoRoutes.get("/sitemap.xml", async (c) => {
  // Static pages
  const staticPages = [
    { loc: "/", priority: "1.0", changefreq: "hourly" },
    { loc: "/search", priority: "0.9", changefreq: "hourly" },
    { loc: "/feeds", priority: "0.8", changefreq: "daily" },
    { loc: "/digest", priority: "0.8", changefreq: "daily" },
    { loc: "/AGENTS.md", priority: "0.5", changefreq: "monthly" },
  ];

  // Published digest editions are public + indexable (unlike /entry/* which is
  // noindex). List them so crawlers can discover every edition.
  const editions =
    (
      await c.env.DB.prepare(
        "SELECT date, lang FROM digest_editions WHERE status = 'published' ORDER BY date DESC LIMIT 2000"
      ).all<{ date: string; lang: string }>()
    ).results ?? [];

  const urls = [
    ...staticPages.map(
      (p) =>
        `  <url><loc>https://dak-news.com${p.loc}</loc><changefreq>${p.changefreq}</changefreq><priority>${p.priority}</priority></url>`
    ),
    ...editions.map(
      (e) =>
        `  <url><loc>https://dak-news.com/digest/${e.date}/${e.lang}</loc><lastmod>${e.date}</lastmod><changefreq>never</changefreq><priority>0.6</priority></url>`
    ),
  ];

  const xml = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
    ...urls,
    `</urlset>`,
  ].join("\n");

  c.header("Cache-Control", "public, max-age=600, s-maxage=3600");
  return c.text(xml, 200, { "Content-Type": "application/xml" });
});

/* ── Server-side meta injection for /entry/:id ── */
let indexHtml: string | null = null;

async function getIndexHtml(c: { env: HonoEnv["Bindings"]; req: { url: string } }): Promise<string> {
  if (!indexHtml) {
    const assets = c.env.ASSETS;
    if (!assets) throw new Error("ASSETS binding not configured");
    const res = await assets.fetch(new Request(new URL("/", c.req.url).toString()));
    indexHtml = await res.text();
  }
  return indexHtml!;
}

/**
 * For entry pages, inject <title> + <meta> + OG tags + JSON-LD into the HTML
 * so crawlers see meaningful content without JS execution.
 * Also injects SEO-optimized meta for /search and /feeds pages.
 */
export function entryMetaMiddleware() {
  const app = new Hono<HonoEnv>();

  /* /entry/:id — full meta + JSON-LD */
  app.get("/entry/:id", async (c) => {
    const id = decodeURIComponent(c.req.param("id"));

    const entry = await c.env.DB
      .prepare("SELECT title, source, category, published, content FROM entries WHERE id = ?")
      .bind(id)
      .first<{ title: string; source: string; category: string; published: string; content: string | null }>();

    let html = await getIndexHtml(c);

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
        `<meta name="robots" content="noindex, nofollow">`,
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

      const bodyContent = [
        `<noscript>`,
        `  <article>`,
        `    <h1>${escapeHtml(entry.title)}</h1>`,
        `    <div>`,
        `      <span>来源: ${escapeHtml(entry.source)}</span> | `,
        `      <span>分类: ${escapeHtml(entry.category)}</span> | `,
        `      <time datetime="${entry.published}">${new Date(entry.published).toLocaleString()}</time>`,
        `    </div>`,
        `    <p>${escapeHtml(entry.content || "*无正文*")}</p>`,
        `  </article>`,
        `</noscript>`,
      ].join("\n");

      html = html.replace(
        /<noscript>[\s\S]*?<\/noscript>/,
        bodyContent
      );
    }

    return c.html(html);
  });

  /* /search — SEO meta for search page */
  app.get("/search", async (c) => {
    let html = await getIndexHtml(c);
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
  app.get("/feeds", async (c) => {
    let html = await getIndexHtml(c);
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
    c.header("Cache-Control", "public, max-age=300, s-maxage=1800, stale-while-revalidate=600");
    return c.html(html);
  });

  /* /digest — public archive index (indexable) */
  app.get("/digest", async (c) => {
    let html = await getIndexHtml(c);
    const metaTags = [
      `<title>DAK Daily — 大案牍库 每日新闻报纸</title>`,
      `<meta name="description" content="大案牍库 DAK Daily：由 AI 撜写的报纸风格每日新闻摘要，覆盖财经、地缘政治、科技与社会热点。免费订阅，每日一封，可随时退订。">`,
      `<link rel="canonical" href="https://dak-news.com/digest">`,
      `<meta property="og:title" content="DAK Daily — 大案牍库 每日新闻报纸">`,
      `<meta property="og:description" content="由 AI 撜写的每日报纸风格新闻摘要。免费订阅，每日一封。">`,
      `<meta property="og:url" content="https://dak-news.com/digest">`,
      `<meta property="og:type" content="website">`,
      `<meta property="og:site_name" content="大案牍库 The Grand Archive">`,
      `<meta name="twitter:card" content="summary">`,
      `<meta name="twitter:title" content="DAK Daily — 大案牍库">`,
      `<meta name="twitter:description" content="由 AI 撜写的每日报纸风格新闻摘要">`,
    ].join("\n    ");
    html = html.replace(/<!-- SEO:START -->[\s\S]*?<!-- SEO:END -->/, () => metaTags);
    c.header("Cache-Control", "public, max-age=300, s-maxage=1800, stale-while-revalidate=600");
    return c.html(html);
  });

  /* /digest/:date/:lang — a single edition: full meta + JSON-LD + noscript body */
  app.get("/digest/:date/:lang", async (c) => {
    const date = c.req.param("date");
    const lang = c.req.param("lang");
    let html = await getIndexHtml(c);
    if (lang !== "en" && lang !== "zh") return c.html(html);

    const ed = await c.env.DB
      .prepare(
        "SELECT title, summary, html FROM digest_editions WHERE date = ? AND lang = ? AND status = 'published'"
      )
      .bind(date, lang)
      .first<{ title: string; summary: string | null; html: string }>();

    if (ed) {
      const title = escapeHtml(ed.title) + " — 大案牍库";
      const description = escapeHtml((ed.summary || ed.title).slice(0, 200).replace(/\s+/g, " "));
      const url = `https://dak-news.com/digest/${encodeURIComponent(date)}/${lang}`;

      const jsonLd = JSON.stringify({
        "@context": "https://schema.org",
        "@type": "NewsArticle",
        "headline": ed.title,
        "description": (ed.summary || ed.title).slice(0, 200),
        "url": url,
        "datePublished": date,
        "inLanguage": lang === "zh" ? "zh-CN" : "en",
        "isAccessibleForFree": true,
        "publisher": {
          "@type": "Organization",
          "name": "大案牍库",
          "url": "https://dak-news.com",
        },
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
        `<meta property="article:published_time" content="${date}">`,
        `<meta name="twitter:card" content="summary">`,
        `<meta name="twitter:title" content="${title}">`,
        `<meta name="twitter:description" content="${description}">`,
        `<script type="application/ld+json">${jsonLd}</script>`,
      ].join("\n    ");
      html = html.replace(/<!-- SEO:START -->[\s\S]*?<!-- SEO:END -->/, () => metaTags);

      const bodyContent = [
        `<noscript>`,
        `  <article>`,
        `    <h1>${escapeHtml(ed.title)}</h1>`,
        `    ${ed.html}`,
        `  </article>`,
        `</noscript>`,
      ].join("\n");
      html = html.replace(/<noscript>[\s\S]*?<\/noscript>/, () => bodyContent);

      c.header("Cache-Control", "public, max-age=600, s-maxage=3600");
    }

    return c.html(html);
  });

  /* /d/:shareId — a shared user digest: OG/Twitter meta with a large image card */
  app.get("/d/:shareId", async (c) => {
    const shareId = decodeURIComponent(c.req.param("shareId"));
    let html = await getIndexHtml(c);

    const digest = await c.env.DB
      .prepare(
        "SELECT lang, date, title, summary, content_json FROM user_digests WHERE share_id = ? AND visibility = 'public'"
      )
      .bind(shareId)
      .first<{ lang: string; date: string; title: string; summary: string | null; content_json: string }>();

    if (digest) {
      let standfirst: string | null = null;
      try {
        standfirst = (JSON.parse(digest.content_json) as { standfirst?: string }).standfirst ?? null;
      } catch {
        standfirst = null;
      }

      const title = escapeHtml(digest.title) + " — 大案牍库";
      const description = escapeHtml(
        (digest.summary || standfirst || digest.title).slice(0, 200).replace(/\s+/g, " ")
      );
      const url = `https://dak-news.com/d/${encodeURIComponent(shareId)}`;
      const image = "https://dak-news.com/og-default.png";

      const jsonLd = JSON.stringify({
        "@context": "https://schema.org",
        "@type": "NewsArticle",
        "headline": digest.title,
        "description": (digest.summary || standfirst || digest.title).slice(0, 200),
        "url": url,
        "image": image,
        "datePublished": digest.date,
        "inLanguage": digest.lang === "zh" ? "zh-CN" : "en",
        "isAccessibleForFree": true,
        "publisher": {
          "@type": "Organization",
          "name": "大案牍库",
          "url": "https://dak-news.com",
        },
      });

      const metaTags = [
        `<title>${title}</title>`,
        `<meta name="robots" content="noindex, nofollow">`,
        `<meta name="description" content="${description}">`,
        `<link rel="canonical" href="${url}">`,
        `<meta property="og:title" content="${title}">`,
        `<meta property="og:description" content="${description}">`,
        `<meta property="og:url" content="${url}">`,
        `<meta property="og:type" content="article">`,
        `<meta property="og:site_name" content="大案牍库 The Grand Archive">`,
        `<meta property="og:image" content="${image}">`,
        `<meta property="og:image:width" content="1200">`,
        `<meta property="og:image:height" content="630">`,
        `<meta property="article:published_time" content="${digest.date}">`,
        `<meta name="twitter:card" content="summary_large_image">`,
        `<meta name="twitter:title" content="${title}">`,
        `<meta name="twitter:description" content="${description}">`,
        `<meta name="twitter:image" content="${image}">`,
        `<script type="application/ld+json">${jsonLd}</script>`,
      ].join("\n    ");
      html = html.replace(/<!-- SEO:START -->[\s\S]*?<!-- SEO:END -->/, () => metaTags);

      c.header("Cache-Control", "public, max-age=600, s-maxage=3600");
    }

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
