# 大案牍库

[![npm](https://img.shields.io/npm/v/@littlelittlecloud/dak)](https://www.npmjs.com/package/@littlelittlecloud/dak)

从多源 RSS 自动收集、分类、索引新闻与资讯，并以 npm 包的形式提供全文搜索与结构化访问。

## Highlights

- **AI as First Citizen** — 内置 Claude Skills，AI Agent 可直接搜索、总结、分析所有 feed 内容
- **大案牍库** (`dak`) — 基于 MiniSearch 的多维度搜索引擎，9700+ 条 feed 全文检索，支持按分类/来源/标签/时间多维过滤
- **大案牍术** (`dak_summary`) — 从海量 feed 中自动提炼每日新闻总结与专题分析
- **CLI + API** — `dak` 命令行工具 + TypeScript API，一行命令搜索、浏览、统计
- **每日更新** — 每日自动更新rss feed，自动构建并发布到 npm

## 安装

```bash
npm install @littlelittlecloud/dak
# 或全局安装 CLI
npm install -g @littlelittlecloud/dak
```

安装后即可使用 `dak` 命令行工具，或在代码中 `import` 使用。

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

> 基于 feed 数据生成结构化摘要

利用 dak 搜索能力，从海量 feed 中提炼信息并生成两种摘要：

- **每日总结** — 自动发现当天所有条目，去重筛选后按主题分组撰写摘要
- **专题总结** — 跨时间维度搜索某个话题，按时间线梳理事件脉络

```
> 总结今天的新闻
> 帮我梳理一下伊朗战争对油价和黄金的影响
> 写一下最近 AI 领域的专题总结
```

**触发关键词：** `总结`、`生成每日总结`、`梳理XX事件`、`写专题总结`

### 在其他项目中使用

Skills 文件位于 `skills/` 目录，可直接复制到任何项目使用：

```bash
# 复制 skill 到你的项目
cp -r skills/dak /your-project/.claude/skills/dak
cp -r skills/dak_summary /your-project/.claude/skills/dak_summary

# 确保 dak CLI 可用
npm install -g @littlelittlecloud/dak
```

## dak CLI

### 搜索

```bash
# 全文搜索（标题 + 正文）
dak search "inflation"

# 按分类 + 关键词
dak search "oil price" -c finance --from 2026-03-01

# 仅搜索标题（更精确）
dak search "AI" --title-only -n 10

# 按标签筛选
dak search -t 中东 -t 地缘政治 --from 2026-03-01

# JSON 输出（便于管道处理）
dak search "tariff" --json -n 50
```

### 浏览

```bash
# 列出某天的所有条目
dak feeds --from 2026-04-02 --to 2026-04-02 -n 100

# 按分类浏览
dak feeds -c tech -n 20

# 按来源浏览，显示正文摘要
dak feeds -s Bloomberg -n 10 --content
```

### 其他

```bash
# 查看索引统计
dak stats

# 搜索建议（自动补全）
dak suggest "inflat"
```

### 完整选项

| 选项 | 缩写 | 说明 |
|------|------|------|
| `--category <cat>` | `-c` | 按分类过滤：`finance` / `news` / `social` / `tech` |
| `--source <src>` | `-s` | 按来源过滤（模糊匹配） |
| `--tag <tag>` | `-t` | 按标签过滤（可多次使用，OR 逻辑） |
| `--author <author>` | `-a` | 按作者过滤 |
| `--from <date>` | | 发布时间起始（YYYY-MM-DD，含） |
| `--to <date>` | | 发布时间截止（YYYY-MM-DD，含） |
| `--title-only` | | 仅搜索标题字段 |
| `--limit <n>` | `-n` | 返回数量上限（默认 20） |
| `--json` | | JSON 格式输出 |
| `--content` | | 显示正文摘要 |

## 编程 API

```typescript
import { getFeeds, getFeedsByCategory, createSearchIndex } from "@littlelittlecloud/dak";

// 获取所有条目
const all = getFeeds(); // FeedEntry[]

// 按分类获取
const finance = getFeedsByCategory("finance");

// 创建搜索索引（建议复用）
const index = createSearchIndex();

// 搜索
const results = index.search({
  query: "inflation",
  category: "finance",
  dateFrom: "2026-03-01",
  limit: 20,
});

results[0].entry.title;   // 标题
results[0].entry.content; // 完整正文
results[0].score;         // 相关度评分

// 自动补全
index.suggest("inflat");
// → ["inflation", "inflationary", "inflated"]

// 索引统计
index.stats();
// → { totalDocuments: 9707, categories: [...], sources: [...], ... }
```

### 更多 API

| 函数 | 说明 |
|------|------|
| `getFeeds()` | 所有条目（按发布时间降序） |
| `getFeedsByCategory(cat)` | 按分类 |
| `getFeedsBySource(src)` | 按来源 |
| `getFeedsByTags(tags)` | 按标签（OR） |
| `getFeedById(id)` | 按 ID（hash） |
| `getFeedsByDateRange(from, to)` | 按时间范围 |
| `getCategories()` | 分类列表 |
| `getSources()` | 来源列表 |
| `getAllTags()` | 标签列表 |

## 搜索能力

基于 [MiniSearch](https://lucaong.github.io/minisearch/) 构建：

- **全文检索** — 标题权重 3×、标签 2×、来源 1.5×、正文 1×
- **模糊匹配** — 容错约 20% 字符距离（`inflaton` → `inflation`）
- **前缀匹配** — `inflat` 匹配 `inflation`、`inflationary`
- **多维过滤** — category、source、tags、author、language、date range
- **过滤逻辑** — 各维度 AND 组合，tags 内部 OR

## 数据源

| 分类 | 内容 | 来源示例 |
|------|------|---------|
| `finance` | 财经、市场、宏观 | Bloomberg, CNBC, MarketWatch, ZeroHedge, 华尔街见闻 |
| `news` | 国际新闻 | AP News, Al Jazeera, BBC 中文, Foreign Affairs |
| `social` | 中文社交媒体 | 知乎热榜, 微博 |
| `tech` | 技术 | Hacker News, 技术博客 |

## 开发

### RSS Feed 收集

```bash
bun install
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

### 构建 dak 包

```bash
cd pkg
bun install
bun run build          # 构建数据 + 编译 TypeScript
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
| `fetch-feeds` | 每 30 分钟 / 手动 | 抓取 RSS → 提交 → 部署 Pages → 发布 dak |
| `publish-dak` | feeds 更新后自动 / 手动 | 构建并发布 `@littlelittlecloud/dak` 到 npm |
| `deploy` | 手动 | 构建并部署 Dashboard 到 GitHub Pages |

## License

MIT
