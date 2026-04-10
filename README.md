# 大案牍库

[![npm](https://img.shields.io/npm/v/@littlelittlecloud/dak)](https://www.npmjs.com/package/@littlelittlecloud/dak)
[![npm](https://img.shields.io/npm/v/@littlelittlecloud/dak-cli)](https://www.npmjs.com/package/@littlelittlecloud/dak-cli)

从多源 RSS 自动收集、分类、索引新闻与资讯，提供全文搜索 API、TypeScript SDK 和 CLI 工具。

### 订阅源一览

| 分类 | 源 |
|------|-----|
| **国际 / 地缘** | BBC 中文 · 纽约时报中文 · Al Jazeera · AP News · Foreign Affairs · The Diplomat · 参考消息 · 人民网 |
| **财经 / 宏观** | Bloomberg · CNBC · MarketWatch · 华尔街见闻 · 第一财经 · 财新网 · ZeroHedge · 金十数据 · 雪球 |
| **社交热点** | 微博热搜 · 知乎热榜 |
| **科技** | Hacker News |

## Highlights

- **AI as First Citizen** — 内置 Claude Skills，AI Agent 可直接搜索、总结、分析所有 feed 内容
- **Server + API** — Hono 服务端，SQLite 存储 14,000+ 条 feed，MiniSearch 全文检索
- **大案牍库** (`@littlelittlecloud/dak`) — TypeScript SDK，HTTP 客户端访问搜索、浏览、统计 API
- **大案牍术** (`dak_summary`) — 从海量 feed 中自动提炼每日新闻总结与专题分析
- **CLI** (`@littlelittlecloud/dak-cli`) — `dak` 命令行工具，一行命令搜索、浏览、统计
- **自动更新** — 每 30 分钟自动抓取 RSS feed

## 架构

```
┌─────────────┐    ┌─────────────────┐    ┌──────────────┐
│  RSS Feeds  │───▶│ Ingestion Worker│───▶│   SQLite DB  │
└─────────────┘    └─────────────────┘    └──────┬───────┘
                                                 │
                          ┌──────────────────────┤
                          ▼                      ▼
                   ┌─────────────┐       ┌──────────────┐
                   │  Hono API   │       │  MiniSearch   │
                   │   Server    │       │    Index      │
                   └──────┬──────┘       └──────────────┘
                          │
            ┌─────────────┼─────────────┐
            ▼             ▼             ▼
      ┌──────────┐ ┌──────────┐ ┌──────────┐
      │   SDK    │ │   CLI    │ │   Web UI │
      └──────────┘ └──────────┘ └──────────┘
```

## npm 包

| 包 | 说明 |
|----|------|
| [`@littlelittlecloud/dak`](https://www.npmjs.com/package/@littlelittlecloud/dak) | TypeScript SDK — HTTP 客户端，支持 ESM / CJS |
| [`@littlelittlecloud/dak-cli`](https://www.npmjs.com/package/@littlelittlecloud/dak-cli) | CLI 工具 — `dak` 命令，零依赖单文件 bundle |

## 安装

```bash
# SDK（在项目中使用）
npm install @littlelittlecloud/dak

# CLI（全局安装）
npm install -g @littlelittlecloud/dak-cli
```

## Skills

本项目提供两个 Claude Code / AI Agent 技能（位于 `skills/` 目录），可在任何支持 skill 的环境中使用。

### 大案牍库 (`skills/dak`)

> 搜索和访问大案牍库中的 feed 数据

基于 MiniSearch 的多维度搜索引擎，支持关键词全文检索、分类/来源/标签/时间等多维过滤。适合快速查找特定新闻、追踪某个话题的报道，或按条件批量获取 feed 条目。

```
> 搜索和关税有关的财经新闻
> 用 dak 查一下最近关于 AI 的文章
> 帮我找 2026 年 3 月关于油价的报道
```

**触发关键词：** `搜索`、`查找文章`、`dak search`、`dak feeds`

### 大案牍术 (`skills/dak_summary`)

> 基于 feed 数据的结构化分析方法论

核心三步：**海量查询** → **关联分析** → **结果输出**

1. **海量查询** — 通过 `dak` CLI 从 9700+ 条 feed 中广泛检索，中英文关键词多轮覆盖
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

### 在其他项目中使用

推荐使用 `npx skills` 一键安装：

```bash
npx skills add LittleLittleCloud/The-Grand-Archive
```

或手动复制 skill 文件：

```bash
# 复制 skill 到你的项目
cp -r skills/dak /your-project/.claude/skills/dak
cp -r skills/dak_summary /your-project/.claude/skills/dak_summary

# 确保 dak CLI 可用
npm install -g @littlelittlecloud/dak-cli
```

## dak CLI

CLI 通过 HTTP 连接 dak-server API，需设置服务器地址：

```bash
export DAK_SERVER_URL=https://dak-server.fly.dev  # 默认 http://localhost:3000
export DAK_API_KEY=your-api-key                    # 可选，用于认证访问
```

### 搜索

```bash
# 全文搜索
dak search "inflation"

# 按分类 + 时间过滤
dak search "oil price" --category finance --from 2026-03-01

# 限制结果数量
dak search "AI" --limit 10

# JSON 输出（便于管道处理）
dak search "tariff" --json
```

### 浏览

```bash
# 列出最新条目
dak feeds

# 按分类浏览
dak feeds --category tech --limit 20

# 按来源浏览
dak feeds --source Bloomberg --limit 10
```

### 其他

```bash
# 查看索引统计
dak stats

# 搜索建议
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

## SDK

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
feeds.entries[0].title;

// 按分类/来源
const finance = await client.getFeedsByCategory("finance");
const bloomberg = await client.getFeedsBySource("Bloomberg");

// 单条详情
const entry = await client.getFeed("entry-id");

// 统计
const stats = await client.getStats();
stats.total;           // 总条目数
stats.byCategory;      // [{ category, count }]
stats.bySource;        // [{ source, count }]
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

## 搜索能力

基于 [MiniSearch](https://lucaong.github.io/minisearch/) 构建，14,000+ 条 feed 全文检索：

- **标题检索** — 快速匹配（364ms 构建索引，低内存占用）
- **模糊匹配** — 容错约 20% 字符距离（`inflaton` → `inflation`）
- **前缀匹配** — `inflat` 匹配 `inflation`、`inflationary`
- **多维过滤** — category、source、date range
- **Tier 限制** — anonymous（28 天）、free（90 天）、premium（无限制）

## 数据源

完整配置见 [`config/sources.yaml`](config/sources.yaml)，目前已启用 21 个订阅源，涵盖中英文财经、国际新闻、社交热点与技术社区。

## 开发

### 项目结构

```
packages/
  contract/     # Zod schemas, types, route constants (workspace-only)
  server/       # Hono API server + SQLite + MiniSearch
  sdk/          # @littlelittlecloud/dak — HTTP client SDK
  cli/          # @littlelittlecloud/dak-cli — CLI tool
  ingestion-worker/  # RSS 抓取 worker（每 30 分钟）
  ui/           # Web dashboard
```

### 本地开发

```bash
bun install

# 启动 API 服务器
cd packages/server && bun run dev

# 运行 ingestion worker（一次性模式）
cd packages/ingestion-worker && ONCE=1 bun run src/index.ts

# CLI 开发（直接用 bun 运行）
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
# SDK
cd packages/sdk && bun run build

# CLI
cd packages/cli && bun run build
```

### 部署

Server 和 Worker 部署在 Fly.io（Tokyo nrt）：

```bash
# Server
cd packages/server && fly deploy

# Worker
cd packages/ingestion-worker && fly deploy
```

### Dashboard

```bash
bun run dev            # 开发服务器
bun run build          # 构建生产版本
bun run deploy         # 部署到 GitHub Pages
```

## CI/CD

| Workflow | 触发 | 作用 |
|----------|------|------|
| `fetch-feeds` | 每 30 分钟 / 手动 | 抓取 RSS → 提交新 feed 文件 |
| `publish-dak` | feeds 更新后自动 / 手动 | 构建并发布 `@littlelittlecloud/dak` + `@littlelittlecloud/dak-cli` 到 npm |
| `deploy` | 手动 | 构建并部署 Dashboard 到 GitHub Pages |

## License

MIT
