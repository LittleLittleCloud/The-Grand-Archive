# 大案牍库

[![npm](https://img.shields.io/npm/v/@littlelittlecloud/dak)](https://www.npmjs.com/package/@littlelittlecloud/dak)
[![npm](https://img.shields.io/npm/v/@littlelittlecloud/dak-cli)](https://www.npmjs.com/package/@littlelittlecloud/dak-cli)
[![GitHub stars](https://img.shields.io/github/stars/LittleLittleCloud/The-Grand-Archive?style=social)](https://github.com/LittleLittleCloud/The-Grand-Archive)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> **大案牍库是一款让你的 AI Agent 拥有跨 20+ 个信源实时新闻搜索能力的工具。**

[English Version](README.md)

---

## 快速上手 — AI Agent 用户

一行命令将大案牍库技能添加到你的 Claude 项目：

```bash
npx skills add LittleLittleCloud/The-Grand-Archive
```

然后告诉你的 Claude：**「搜索最近关于关税的新闻」** — 就这么简单。

你的 AI Agent 现在可以搜索、总结、分析来自 Bloomberg、AP News、Hacker News 等 14,000+ 条实时新闻条目。

---

## 快速上手 — 开发者

安装 TypeScript SDK：

```bash
npm install @littlelittlecloud/dak
```

```typescript
import { DakClient } from "@littlelittlecloud/dak";

const client = new DakClient({ baseUrl: "https://dak-server.fly.dev" });

const result = await client.search({ q: "关税", category: "finance", limit: 10 });
console.log(result.results[0].title);
```

或直接使用 CLI：

```bash
npm install -g @littlelittlecloud/dak-cli
dak search "AI 监管" --category tech
```

---

## 典型使用场景

- **「总结今天的财经头条」** — 从 Bloomberg、CNBC、MarketWatch 等多源生成结构化摘要
- **「追踪某话题的多源报道」** — 对比 AP News、Al Jazeera、BBC 对同一事件的报道角度
- **「带引用的深度分析」** — 拉取 30+ 篇相关文章，按主题聚类，输出研究简报

---

## 功能特性

- **AI 原生** — 内置 Claude Skills，Agent 无需额外配置即可搜索、过滤、总结
- **21 个实时信源** — 覆盖财经、地缘政治、科技和社交热点，每 30 分钟更新
- **全文搜索** — 基于 MiniSearch，支持模糊匹配和前缀匹配，覆盖 14,000+ 条目
- **TypeScript SDK** — 类型完备的 HTTP 客户端，支持 ESM 和 CJS
- **CLI 工具** — `dak` 命令，一行搜索和浏览 feed
- **分级访问** — 匿名（28 天）、免费（90 天）、高级（无限制）

---

## 订阅源

| 分类 | 信源 |
|------|------|
| **国际 / 地缘** | BBC 中文 · 纽约时报中文 · Al Jazeera · AP News · Foreign Affairs · The Diplomat · 参考消息 · 人民网 |
| **财经 / 宏观** | Bloomberg · CNBC · MarketWatch · 华尔街见闻 · 第一财经 · 财新网 · ZeroHedge · 金十数据 · 雪球 |
| **社交热点** | 微博热搜 · 知乎热榜 |
| **科技** | Hacker News |

完整配置见 [`config/sources.yaml`](config/sources.yaml)

---

## Skills（AI Agent 集成）

`skills/` 目录下包含两个 Claude Code / AI Agent 技能。

### `skills/dak` — 搜索与浏览

> 搜索和访问大案牍库中的 feed 数据

支持全文检索，可按分类 / 来源 / 标签 / 时间范围过滤。

```
> 搜索和关税有关的财经新闻
> 用 dak 查一下最近关于 AI 的文章
> 帮我找 2026 年 3 月关于油价的报道
```

**触发关键词：** `搜索`、`查找文章`、`dak search`、`dak feeds`

### `skills/dak_summary` — 结构化分析

> 基于 feed 数据的结构化分析方法论

核心三步：**海量查询** → **关联分析** → **结果输出**

1. **海量查询** — 通过 `dak` CLI 从 14,000+ 条 feed 中广泛检索, 中英文关键词多轮覆盖
2. **关联分析** — 去重、交叉验证、模式识别（时间线/因果/趋势）、主题聚类
3. **结果输出** — 写入结构化摘要文件

两个典型应用场景：

- **每日总结** — 对某天全部 feed 执行大案牍术，输出按主题分组的每日摘要
- **专题总结** — 跨时间维度对某个话题执行大案牍术，按时间线梳理事件脉络

```
> 总结今天的新闻
> 帮我梳理一下伊朗战争对油价和黄金的影响
> 写一下最近 AI 领域的专题总结
```

**触发关键词：** `总结`、`生成每日总结`、`梳理XX事件`、`写专题总结`

### 安装 Skills

推荐一键安装：

```bash
npx skills add LittleLittleCloud/The-Grand-Archive
```

或手动复制：

```bash
cp -r skills/dak /your-project/.claude/skills/dak
cp -r skills/dak_summary /your-project/.claude/skills/dak_summary
npm install -g @littlelittlecloud/dak-cli
```

---

## CLI 参考

CLI 默认连接 `https://dak-server.fly.dev`。设置 API Key 可解锁高级访问权限：

```bash
export DAK_API_KEY=your-api-key  # 高级订阅必填（90 天历史数据 + 更高请求限额）
```

### 搜索

```bash
dak search "inflation"
dak search "oil price" --category finance --from 2026-03-01
dak search "AI" --limit 10
dak search "tariff" --json
```

### 浏览

```bash
dak feeds
dak feeds --category tech --limit 20
dak feeds --source Bloomberg --limit 10
```

### 其他

```bash
dak stats
dak suggest "inflat"
```

### 完整选项

| 选项 | 说明 |
|------|------|
| `--category <cat>` | 按分类过滤：`finance` / `news` / `social` / `tech` / `blog` / `podcast` |
| `--source <src>` | 按来源过滤 |
| `--from <date>` | 发布时间起始（ISO 8601） |
| `--to <date>` | 发布时间截止（ISO 8601） |
| `--limit <n>` | 返回数量上限（默认 20） |
| `--json` | JSON 格式输出 |

---

## SDK 参考

```typescript
import { DakClient } from "@littlelittlecloud/dak";

const client = new DakClient({
  baseUrl: "https://dak-server.fly.dev",
  apiKey: "your-api-key", // 可选
});

// 搜索
const result = await client.search({
  q: "inflation",
  category: "finance",
  from: "2026-03-01",
  limit: 20,
});
result.results[0].title;   // 标题
result.results[0].score;   // 相关度评分
result.total;              // 总匹配数
result.tier;               // "anonymous" | "free" | "premium"

// 浏览
const feeds = await client.getFeeds({ category: "tech", limit: 10 });
const finance = await client.getFeedsByCategory("finance");
const bloomberg = await client.getFeedsBySource("Bloomberg");

// 单条详情
const entry = await client.getFeed("entry-id");

// 统计
const stats = await client.getStats();
stats.total;        // 总条目数
stats.byCategory;   // [{ category, count }]
stats.bySource;     // [{ source, count }]
```

### API 方法

| 方法 | 说明 |
|------|------|
| `search(params)` | 全文搜索，支持分类/来源/时间/分页 |
| `getFeeds(params?)` | 浏览条目，支持多维过滤 |
| `getFeed(id)` | 按 ID 获取单条 |
| `getFeedsByCategory(cat)` | 按分类获取 |
| `getFeedsBySource(src)` | 按来源获取 |
| `getStats()` | 获取索引统计 |

---

## 技术细节

### 搜索能力

基于 [MiniSearch](https://lucaong.github.io/minisearch/) 构建，14,000+ 条 feed 全文检索：

- **标题检索** — 快速匹配（364ms 构建索引，低内存占用）
- **模糊匹配** — 容错约 20% 字符距离（`inflaton` → `inflation`）
- **前缀匹配** — `inflat` 匹配 `inflation`、`inflationary`
- **多维过滤** — category、source、date range
- **Tier 限制** — anonymous（28 天）、free（90 天）、premium（无限制）

### 架构

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

### npm 包

| 包 | 说明 |
|----|------|
| [`@littlelittlecloud/dak`](https://www.npmjs.com/package/@littlelittlecloud/dak) | TypeScript SDK — HTTP 客户端，支持 ESM / CJS |
| [`@littlelittlecloud/dak-cli`](https://www.npmjs.com/package/@littlelittlecloud/dak-cli) | CLI 工具 — `dak` 命令，零依赖单文件 bundle |

### 项目结构

```
packages/
  contract/          # Zod schemas、类型定义、路由常量（仅 workspace 内部使用）
  server/            # Hono API 服务器 + SQLite + MiniSearch
  sdk/               # @littlelittlecloud/dak — HTTP 客户端 SDK
  cli/               # @littlelittlecloud/dak-cli — CLI 工具
  ingestion-worker/  # RSS 抓取 worker（每 30 分钟）
  ui/                # Web 控制台
```

### 本地开发

```bash
bun install

# 启动 API 服务器
cd packages/server && bun run dev

# 运行 ingestion worker（一次性模式）
cd packages/ingestion-worker && ONCE=1 bun run src/index.ts

# CLI 开发
cd packages/cli && bun run src/index.ts search "test"
```

### RSS Feed 收集

```bash
bun run fetch              # 抓取所有已启用的订阅源
bun run fetch finance      # 只抓取 finance 分类
bun run list               # 列出已保存的条目
bun run sources            # 查看所有订阅源
```

### 添加订阅源

编辑 `config/sources.yaml`：

```yaml
- name: 订阅名称
  url: "{{RSSHUB_BASE_URL}}/example/route"
  category: tech
  enabled: true
  fetch_interval: 3600
  tags: [标签1, 标签2]
  description: 简短描述
```

### 构建 npm 包

```bash
cd packages/sdk && bun run build
cd packages/cli && bun run build
```

### 部署

Server 和 Worker 部署在 Fly.io（Tokyo nrt）：

```bash
cd packages/server && fly deploy
cd packages/ingestion-worker && fly deploy
```

### Dashboard

```bash
bun run dev     # 开发服务器
bun run build   # 构建生产版本
bun run deploy  # 部署到 GitHub Pages
```

### CI/CD

| Workflow | 触发 | 作用 |
|----------|------|------|
| `fetch-feeds` | 每 30 分钟 / 手动 | 抓取 RSS → 提交新 feed 文件 |
| `publish-dak` | feeds 更新后自动 / 手动 | 构建并发布 `@littlelittlecloud/dak` + `@littlelittlecloud/dak-cli` 到 npm |
| `deploy` | 手动 | 构建并部署 Dashboard 到 GitHub Pages |

---

## License

MIT
