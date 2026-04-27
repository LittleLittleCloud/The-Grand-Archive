# SEO 修复进度追踪

> 起始日期: 2026-04-25
> 目标: 解决 dak-news.com 流量低的 SEO 问题

---

## 基线 Benchmark (2026-04-25) — Google Search Console

**效果 (Performance)**
- 网页搜索点击: **0 次**（4/15 – 4/22 期间完全为零）

**编制索引 (Indexing)**
- 已编入索引: **1 个网页**（约 2026-04 初才从 0 升到 1）
- 未编入索引: **1 个网页**
- 38,000+ 条新闻条目 **完全不在索引中**

**体验 (Experience)**
- 核心网页指标 (Core Web Vitals): 移动端/桌面端均 **无数据**（流量太低无法评估）
- HTTPS: 7 个页面，0 个非 HTTPS ✅

**增强功能**: 无任何结构化数据

---

### 目标指标

| 指标 | 当前值 | 目标 |
|---|---|---|
| Google 搜索点击 | 0 | > 0，持续增长 |
| Google 已索引页面 | 1 | 数千+（条目页 + 列表页） |
| robots.txt | ❌ 404 | ✅ |
| sitemap.xml | ❌ 404 | ✅ 动态生成 |
| Meta description | ❌ 缺失 | ✅ 每页动态 |
| Open Graph 标签 | ❌ 缺失 | ✅ |
| SSR / 预渲染 | ❌ 纯 CSR | ✅ 至少条目页 |
| 路由方式 | Hash (`#/`) | History API (`/`) |
| 结构化数据 | ❌ 无 | ✅ NewsArticle schema |

---

## 问题清单 & 修复进度

### P0 — 阻断性问题

- [x] **Hash 路由 → History API**
  - 文件: `packages/ui/src/App.tsx`（路由逻辑）
  - 文件: `packages/server/src/index.ts`（SPA fallback 已有）
  - 说明: 当前使用 `window.location.hash`，搜索引擎无法索引 `#` 后的路径
  - 工作量: 中等 — 需改所有 `<a href="#/...">` 和导航逻辑

- [x] **SSR 或预渲染条目详情页**
  - 说明: 纯 CSR，爬虫看到空 `<div id="root"></div>`
  - 方案选项:
    - A) 服务端为 `/entry/:id` 注入 meta 标签（轻量） ✅ 已实现
    - B) 完整 SSR（重构大）
    - C) 预渲染服务（如 prerender.io）
  - 采用: 方案 A — Hono 拦截 /entry/:id，动态注入 title + meta + OG 标签

### P1 — 高优先级

- [x] **添加 `robots.txt`**
  - 在 Hono 服务端 `/robots.txt` 路由

- [x] **生成动态 `sitemap.xml`**
  - 从数据库查询最近 5000 条目 + 静态页

- [x] **`index.html` 添加 SEO meta 标签**
  - `<meta name="description">`
  - `<link rel="canonical">`
  - `<html lang="zh">`
  - Open Graph + Twitter Card

- [x] **条目详情页动态 `<title>` 和 `<meta description>`**
  - 服务端拦截 /entry/:id 注入

### P2 — 改善项

- [x] **添加 Open Graph + Twitter Card 标签**

- [x] **修复 `lang="en"` → `lang="zh"`（或双语 hreflang）**

- [x] **修复 Discord 占位链接 `https://discord.gg/TODO`**

---

## 修改日志

| 日期 | 变更 | 相关文件 |
|---|---|---|
| 2026-04-25 | 创建追踪文档，完成问题诊断 | `doc/SEO_TRACKER.md` |
| 2026-04-25 | **P0: Hash 路由 → History API** — 创建 `router.ts`（navigate/usePath/handleLinkClick），更新 App.tsx 及全部 11 个页面组件 | `packages/ui/src/router.ts`, `App.tsx`, `AppBar.tsx` 等 |
| 2026-04-25 | **P1: 添加 robots.txt** — Hono 服务端路由 | `packages/server/src/routes/seo.ts` |
| 2026-04-25 | **P1: 添加动态 sitemap.xml** — 含静态页 + 最近 5000 条目 | `packages/server/src/routes/seo.ts` |
| 2026-04-25 | **P1: index.html SEO meta 标签** — description, OG, Twitter Card, lang="zh", canonical | `packages/ui/index.html` |
| 2026-04-25 | **P0: 条目页服务端 meta 注入** — /entry/:id 请求会注入动态 title + OG + Twitter 标签 | `packages/server/src/routes/seo.ts`, `index.ts` |
| 2026-04-25 | **P2: 修复 Discord 占位链接** — 替换为 GitHub 链接，移除无效 discord.gg/TODO | `packages/ui/src/LandingPage.tsx` |
| 2026-04-27 | **SEO/GEO: 添加 FAQ 区块** — 5 条常见问题（AI 新闻聚合器角度），中英双语 i18n，FAQPage JSON-LD 结构化数据 | `LandingPage.tsx`, `i18n/en.ts`, `i18n/zh.ts`, `index.html` |
