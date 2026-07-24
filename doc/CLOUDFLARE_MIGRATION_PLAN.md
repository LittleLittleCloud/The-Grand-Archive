大案牍库 — Cloudflare Migration Plan
====================================

Status: **Investigation / proposal** (2026-07-22)
Author: automated investigation
Decision defaults (chosen autonomously, revisit before implementation):
- Target: **Native Cloudflare Workers + D1 + Cron Triggers**; **UI on Cloudflare Pages**
- UI hosting: **Pages project serving the static UI + Pages Functions (Hono API + SEO), same origin** (see §3.8)
- CJK tokenizer: **WASM jieba at query time** (fallback: precompute-at-ingestion)
- Rate limiting: **Cloudflare Rate Limiting binding** (upgrade to Durable Object if per-user `reqBalance` precision is required)

---

## 1. Current architecture (Fly.io)

| Component | Stack | Fly.io deployment |
|-----------|-------|-------------------|
| `packages/server` | Bun + Hono + `@hono/zod-openapi`, `bun:sqlite`, Better Auth, FTS5, `@node-rs/jieba`, Resend | `dak-server` machine + `/data` volume + **Litestream** → R2 |
| `packages/ingestion-worker` | Bun + `rss-parser` + `turndown` + `yaml` | `dak-worker`, scheduled hourly (`ONCE=1`), POSTs to server API |
| `packages/ui` | React + Vite + Tailwind (static build) | Served by the Bun server as static files (`STATIC_DIR`) |
| `packages/{contract,sdk,cli}` | Shared TS, published to npm | n/a |

Key traits that make this a **rewrite, not a config swap**:
- Synchronous embedded SQLite (`bun:sqlite`) accessed everywhere.
- Native Rust N-API addon (`@node-rs/jieba`) for Chinese segmentation.
- In-memory rate limiter + boot-time FTS index rebuild (single long-lived process).
- Static UI + SEO meta injection served from the same Bun process.

---

## 2. Target architecture (Cloudflare)

```
   RSSHub (container, ~20 CN sources) ─┐
   direct RSS (BBC/CNBC/HN/…) ─────────┤
                    ┌──────────────────▼──────────────────────┐
                    │ ingestion Worker (Cron: */30 min)        │
                    │  rss-parser + turndown(+DOM polyfill)    │
                    │  → writes directly to D1                 │
                    └──────────────────┬──────────────────────┘
                                       │ D1 binding
                    ┌──────────────────▼──────────────────────┐
   Browser ───────▶ │ Cloudflare Pages — dak-news.com          │
                    │  static UI (Vite build)                  │
   CLI / SDK ─────▶ │  Pages Functions: Hono API + SEO         │
                    │   D1 (entries, api_keys, auth tables)    │
                    │   FTS5 in D1 · jieba-wasm · Better Auth  │
                    │   Rate Limiting binding                  │
                    └──────────────────────────────────────────┘
```

Same origin (UI + API + SEO all under `dak-news.com`) ⇒ no CORS and Better Auth cookies work without cross-domain config. The API/Hono logic runs as **Pages Functions** (Workers under the hood) rather than a standalone Worker; all porting work in §3 applies identically.

Removed: Fly machines, persistent volume, Litestream, R2 DB replica (D1 Time Travel replaces backups).

> ✅ **Spike done (2026-07-22, `.spike-cf/`, verified on workerd):** both high-risk items work.
> - **jieba-wasm** — use the `web` target: `import init, { cut_for_search, initSync } from "jieba-wasm/web"` + `import wasm from "./jieba.wasm"` (copy `pkg/web/jieba_rs_wasm_bg.wasm` into src) + `initSync({ module: wasm })`. Default dict embedded; CJK+latin segmentation confirmed.
> - **turndown** — wrangler bundles for the browser, so turndown's `browser` field pulls in its `document.implementation` build (breaks with `document is not defined`). Fix: parse with `@mixmark-io/domino` and pass a **DOM node**: `td.turndown(domino.createDocument(html).body)`.
> - **Bundle: 2.79 MB gzipped** (jieba+turndown+domino) — fits free (3 MB) and paid (10 MB). `compatibility_flags: ["nodejs_compat"]`.

---

## 3. Required changes (native Workers + D1 path)

### 3.1 Data layer: `bun:sqlite` → D1 (largest change)
- All DB access is **synchronous** today and must become **async**:
  - `packages/server/src/db/client.ts`
  - `packages/server/src/search/fts5.ts`
  - `packages/server/src/middleware/tier.ts`
  - `packages/server/src/routes/ingest.ts` (and any other route touching the DB)
- `db.query(...).all()` → `await env.DB.prepare(...).all()`.
- `db.transaction(...)` → `env.DB.batch([...])`.
- Remove `PRAGMA journal_mode = WAL`, `busy_timeout`, `foreign_keys` boot calls (D1-managed).
- Thread the `env`/`D1Database` binding through request context (Hono `c.env.DB`) instead of a module-level singleton `getDb()`.

### 3.2 Schema & migrations
- Convert `runMigrations()` + Better Auth `runMigrations()` + boot-time legacy table cleanup (in `src/index.ts`) into **`wrangler d1 migrations`** files under `packages/server/migrations/`.
- Include: `entries`, `api_keys`, Better Auth tables (`users`, `sessions`, `account`, `verification`), indexes, and the FTS5 virtual table + sync triggers.

### 3.3 Full-text search (FTS5)
- D1 **supports FTS5** — search survives.
- Replace "drop + rebuild on every boot" (`Fts5SearchEngine.init()`) with a **persistent** FTS table maintained **incrementally**:
  - Populate the FTS table on insert in the ingestion path.
  - Prefer FTS5 external-content + `INSERT/UPDATE/DELETE` triggers so it stays in sync with `entries`.
- Drop the MiniSearch backend for production (in-memory index is incompatible with stateless isolates). Keep it only for local/testing if desired.

### 3.4 Chinese tokenizer (hard blocker)
- `@node-rs/jieba` (native addon) **cannot run on Workers**.
- **Decision: use `jieba-wasm`** for query-time tokenization in `packages/server/src/search/tokenizer.ts`.
  - Validate bundle size vs Workers limit (paid plan 10 MB compressed; jieba dict is a few MB).
  - `Jieba.withDict(dict)` init happens once per isolate at module load.
- Fallback if WASM is too large/slow: precompute tokens at **ingestion** into a `tokens` column, and use a lightweight query-side tokenizer (degrades CJK segmentation quality).

### 3.5 Authentication (Better Auth)
- Switch `packages/server/src/auth/better-auth.ts` from the `bun:sqlite` database to the **D1 / Kysely adapter**.
- Move table provisioning to migrations (no request-time migration).
- Cookies/sessions work on Workers; keep `basePath: /api/auth`, update `trustedOrigins`/`BETTER_AUTH_URL` for the Workers domain.
- `resend` (HTTP SDK) works unchanged on Workers.

### 3.6 Rate limiting
- Replace the in-memory `Map` counter in `middleware/tier.ts`.
- **Decision: Cloudflare Rate Limiting binding** keyed by userId / `x-forwarded-for`.
- If precise per-user tiers + `reqBalance` top-ups must be exact, use a **Durable Object** counter instead.

### 3.7 Remove Bun/Node runtime deps (so API + ingestion run on Workers)
Goal: neither the API (Pages Functions) nor the ingestion Worker may import `bun:*`, use `Bun.*` globals, or touch `node:fs`/`node:path`. Full inventory of what to replace:

| File | Bun/Node API used | Replacement |
|------|-------------------|-------------|
| `server/src/auth/api-key.ts` | `new Bun.CryptoHasher("sha256")` | Web Crypto `await crypto.subtle.digest("SHA-256", …)`. **Becomes async** → `hashApiKey`/`generateApiKey`/`verifyApiKey` and all callers (middleware, routes) go async. |
| `server/src/auth/better-auth.ts` | `new Database()` (`bun:sqlite`), `process.env.*` | Better Auth **D1/Kysely adapter**; read secrets from `env`. |
| `server/src/db/client.ts` | `bun:sqlite` `Database`, sync `query().all()/get()/run()`, `db.transaction`, `PRAGMA` | D1 `env.DB`, async `prepare().bind().all()/run()`, `env.DB.batch([...])`; drop `PRAGMA`. |
| `server/src/index.ts` | `Bun.serve`, `hono/bun` `serveStatic`, `bun:sqlite`, `process.env`, boot-time migrations | Pages Functions entry (`hono/cloudflare-pages`); static hosting via Pages; migrations move to `wrangler d1 migrations` (no request-time DDL). |
| `server/src/routes/seo.ts` | `readFileSync(staticDir + "/index.html")` + module cache | `entryMetaMiddleware` fetches the shell via `env.ASSETS.fetch(new URL("/index.html", req.url))` then injects meta; `robots.txt`/`sitemap.xml`/`AGENTS.md` stay inline (no `fs`). |
| `server/src/routes/ingest.ts` | `process.env.INGEST_ALLOWED_USERS` | `env` var — or drop the route if ingestion writes to D1 directly (§3.9). |
| `server/src/search/engine.ts` | `process.env.SEARCH_ENGINE` | `env` var; default `fts5`. |
| `server/src/search/minisearch.ts` | in-memory index via sync `getDb()` | Not viable on stateless isolates — **drop for prod** (keep only for local/tests). |
| `server/src/search/bench.ts` | `Bun.gc`, `process.env`, `bun test` | Dev-only tool — port to Vitest or exclude from the Worker bundle. |
| `server/src/**/*.test.ts` | `process.env.DB_PATH=":memory:"`, `bun test` | `@cloudflare/vitest-pool-workers` with Miniflare **D1** fixtures. |
| `ingestion-worker/src/config/sources.ts` | `readFileSync` + `resolve` + `import.meta.dir` (fs/path), `process.env` | **Bundle `config/sources.yaml` at build** (import as string and parse, or pre-convert to JSON and `import`); read `RSSHUB_BASE_URL`/`CONFIG_DIR` from `env`. |
| `ingestion-worker/src/index.ts` | `process.env`, `setInterval`, `process.exit` | `scheduled()` handler; **cron replaces `setInterval`**; no `process.exit`. |
| `server/Dockerfile`, `ingestion-worker/Dockerfile` | Bun runtime image | Removed (no Docker on Pages/Workers). |

Also covered elsewhere: `@node-rs/jieba` → `jieba-wasm` (§3.4), Better Auth `bun:sqlite` → D1 (§3.5). `resend` is a fetch-based SDK and works unchanged.

### 3.8 UI on Cloudflare Pages
- **Decision: deploy `packages/ui` (Vite build) to Cloudflare Pages** — Git-based deploys + per-PR preview environments.
- The SEO/agent endpoints in `routes/seo.ts` (`robots.txt`, `sitemap.xml`, `llms.txt`, `AGENTS.md`, `/entry/:id.md`, `/docs`, `/openapi.json`) and `entryMetaMiddleware` are **server-generated** and must stay at the **apex** (`dak-news.com`) for SEO — they are not part of the static React bundle.
- **Recommended shape — single Pages project, same origin:**
  - Pages serves the static UI at the apex.
  - The Hono API + SEO routes run as **Pages Functions** (`functions/[[path]].ts` via `hono/cloudflare-pages`), with the **D1 binding attached to the Pages project**. The "server Worker" becomes Pages Functions.
  - Same origin ⇒ **no CORS**, Better Auth cookies work without cross-domain config, robots/sitemap/AGENTS stay at the apex.
  - Add `_routes.json` so Functions run only for dynamic paths (`/api/*`, `/entry/*`, `/robots.txt`, `/sitemap.xml`, `/openapi.json`, `/llms.txt`, `/AGENTS.md`, `/docs`); everything else is served as static assets.
- **Alternative — split origins (standalone API Worker):** UI on Pages at `dak-news.com`, API Worker at `api.dak-news.com`. Costs: CORS on the Worker (allow UI origin + credentials); Better Auth cookies need `Domain=.dak-news.com`, `SameSite=None; Secure`, and updated `trustedOrigins`; **still** need apex Pages Functions for robots/sitemap/entry-meta. More moving parts — not recommended.
- Replace the Vite dev proxy (`vite.config.ts` proxies `/api`, `/openapi.json`, `/robots.txt`, `/sitemap.xml`, `/entry/*.md`, `/AGENTS.md`, `/llms.txt`, `/docs`) with `wrangler pages dev` running Functions locally.
- `entryMetaMiddleware` crawler injection: fetch the built `index.html` from the Pages **ASSETS** binding (`env.ASSETS.fetch`) inside the Function, inject `<title>`/OG/JSON-LD, and return — replaces today's `fs.readFileSync(staticDir + "/index.html")`.

### 3.9 Ingestion Worker → Cron Trigger
- Convert `packages/ingestion-worker` to a Worker with a `scheduled()` handler, **cron `*/30 * * * *`**.
- Remove Bun/Node deps (see §3.7): bundle `config/sources.yaml` instead of `fs`/`path`/`import.meta.dir`; drop `setInterval`/`process.exit` (cron drives cadence); read config from `env`.
- **Cleaner design: write directly to the shared D1 binding** instead of HTTP POST to the server (removes the ingest API key + `INGEST_ALLOWED_USERS` gate for internal use).
- Compatibility risks to validate:
  - `rss-parser` (xml2js / Node streams) → needs `nodejs_compat`; verify.
  - `turndown` requires a **DOM** → add `@mixmark-io/domino` (or replace) on Workers.
- Keep tokenization consistent with the API (populate FTS on insert, same `jieba-wasm`).

### 3.10 Remove Litestream / R2 DB replica
- Delete `packages/server/litestream.yml` and its R2 replica config.
- Rely on **D1 Time Travel** for point-in-time recovery. (R2 may remain for other uses; not for the DB.)

### 3.11 RSSHub dependency (cannot be a Worker)
- ~20 sources in `config/sources.yaml` route through a self-hosted **RSSHub** instance
  (`{{RSSHUB_BASE_URL}}`), currently the Fly app `da-an-du-ku-rsshub`
  (`diygod/rsshub:chromium-bundled`, Puppeteer + headless Chromium, ~1 GB RAM — see `deploy/fly.toml`).
  Direct-RSS sources (BBC, Al Jazeera, Bloomberg, CNBC, MarketWatch, HN) do **not** need it.
- RSSHub is a full Express app that runs in-process Chromium; it **cannot run on the Workers runtime**.
  It must stay on a container/VM.
- **Decision: keep RSSHub as a standalone container**, reached by the ingestion Worker over HTTPS via
  `RSSHUB_BASE_URL`. Two hosting choices:
  1. **Cloudflare Containers** running the official `diygod/rsshub` image (consolidates onto one platform;
     validate Chromium memory/CPU limits and scale-to-zero cold starts).
  2. **Leave RSSHub off-Cloudflare** (Fly / small VM) unchanged — simplest, lowest risk. **Recommended for the first cut.**
- Caveats (pre-existing, unchanged by the migration): some CN routes need an outbound **proxy/cookies**;
  Chromium routes carry a real memory footprint, so full scale-to-zero adds cold-start latency against the 30-min cron.

---

## 4. Data migration (preserve ALL data)

**Source of truth: the SQLite file `dak.db` backed up on R2** (bucket `dak-backup`, key `dak.db`, endpoint in `.env` `R2_ENDPOINT`) via Litestream — the same DB Fly restores on boot. Migration pulls that file and loads it into D1 verbatim (entries + auth tables + api_keys).

1. **Pull `dak.db` from R2.** Either `litestream restore -o dak.db s3://dak-backup/dak.db` (config from `litestream.yml`, credentials from `.env` `R2_*`) or download the raw object with an S3 client. Verify with `sqlite3 dak.db "SELECT count(*) FROM entries;"` (~14k expected).
2. **Create the D1 DB:** `wrangler d1 create dak`.
3. **Apply schema migrations:** `wrangler d1 migrations apply dak --remote` (creates `entries`, `api_keys`, Better Auth tables, indexes, FTS5 + triggers — §3.2/§3.3).
4. **Export data only** (no schema/DDL clashes) from the pulled file: dump `INSERT` rows per table (`entries`, `users`, `sessions`, `account`, `verification`, `api_keys`) — e.g. `sqlite3 dak.db ".mode insert entries" "SELECT * FROM entries;"`, or a script emitting batched `INSERT` statements.
5. **Import into D1:** `wrangler d1 execute dak --remote --file=data.sql` (split into ≤ a few-MB / ~10k-statement batches to respect D1 import limits).
6. **Build FTS5 once** from `entries` (one-off), then triggers keep it in sync (§3.3).
7. **Validate parity:** compare row counts per table (source `dak.db` vs D1) and spot-check search + a few entry pages before DNS cutover.

Note: D1 rows/values must match the current schema; the RFC-822→ISO date normalization (`db/client.ts` `normalizePublishedDates`) has already run on the live DB, so no re-normalization is expected — verify during step 7.

> ⚠️ The R2 keys, Resend key, and OAuth secrets are currently in plaintext `.env`. **Rotate them** as part of cutover and store via Pages/Worker secrets.

---

## 5. New config artifacts
- **Cloudflare Pages project** for `packages/ui`: build command `bun run build`, output `packages/ui/dist`, plus `functions/` (Hono API + SEO) and `_routes.json`. Bindings on the Pages project: D1, Rate Limiting, `compatibility_date`, `nodejs_compat`, vars.
- `packages/ingestion-worker/wrangler.jsonc`: D1 binding, cron trigger `*/30 * * * *`, `nodejs_compat`.
- Secrets (Pages project + ingestion Worker) via dashboard / `wrangler ... secret put`: `RESEND_API_KEY`, `GITHUB_CLIENT_ID/SECRET`, `GOOGLE_CLIENT_ID/SECRET`, `BETTER_AUTH_URL`, `BETTER_AUTH_SECRET`. **Rotate the credentials currently in `.env`.**
- Custom domain `dak-news.com` on the Pages project.
- Update `package.json` deploy scripts: `deploy:ui` (`wrangler pages deploy`), `deploy:ingest` (`wrangler deploy`); drop `fly deploy`.
- Remove/retire: `packages/*/fly.toml`, `packages/*/Dockerfile`, `deploy/fly.toml`, `scripts/check-fly-single-machine.ts`, `scripts/pull-db.sh` (Fly-specific).

---

## 6. Reusable as-is
- `packages/contract`, `packages/sdk`, `packages/cli` (HTTP client — only base URL changes).
- `packages/ui` static build (deployed to Pages).
- `resend`, `zod`, `hono`, `@hono/zod-openapi`, `minisearch` (all Workers/Pages-compatible).

---

## 7. Effort / risk summary

| Area | Effort | Risk |
|------|--------|------|
| DB layer sync→async (D1) | High | Medium (mechanical but wide) |
| Remove Bun globals (`Bun.CryptoHasher`→Web Crypto, async ripple) | Low–Med | Low |
| jieba → WASM on Workers | Medium | **High** (bundle size / compat) |
| FTS5 persistent + triggers | Medium | Low (D1 supports FTS5) |
| Better Auth D1 adapter | Medium | Medium |
| Rate limiting binding | Low | Low |
| UI on Pages + Functions (API/SEO, same origin) | Low–Med | Low |
| Ingestion cron + turndown DOM | Medium | **High** (`turndown` DOM on Workers) |
| RSSHub hosting (container, ~20 sources) | Low–Med | Medium (Chromium footprint, CN proxy/cookies) |
| Data migration to D1 | Low | Low |

**Top two risks to de-risk first with a spike:** (1) `jieba-wasm` running within Workers size/CPU limits; (2) `turndown` HTML→Markdown working on the Workers runtime (DOM polyfill).

---

## 8. Alternative considered: Cloudflare Containers
Run the existing Bun image in a Cloudflare Container — minimal code change, but Containers have **no persistent disk volume** like Fly, so the SQLite-on-disk + Litestream model doesn't map cleanly (still needs external durable storage). Not idiomatic; stopgap only. **Rejected** in favor of the native path.

---

## 9. Suggested implementation order
1. Spike: validate `jieba-wasm` + `turndown` on Workers (`wrangler dev`).
2. Create D1 DB + migration files (schema + FTS + triggers).
3. Port `db/client.ts` and all route/middleware DB calls to async D1; remove Bun globals (`Bun.CryptoHasher` → Web Crypto; make `hashApiKey`/`verifyApiKey` and callers async).
4. Port tokenizer to `jieba-wasm`; make FTS incremental.
5. Port Better Auth to the D1 adapter.
6. Swap rate limiter to the Rate Limiting binding.
7. Set up the Pages project: static UI + `functions/` (Hono API + SEO, `entryMeta` via `env.ASSETS`) + `_routes.json`; bind D1.
8. Convert ingestion to a Cron Worker (bundle `sources.yaml`, no `setInterval`/`fs`) writing to D1.
9. Pull `dak.db` from R2 and import all data into D1; validate row-count parity.
10. Cut over `dak-news.com` DNS to Pages; retire Fly + Litestream.
