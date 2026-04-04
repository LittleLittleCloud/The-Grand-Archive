# dak — 大案牍库

> RSS Feed 数据包，提供 feeds 访问与全文搜索能力

将大案牍库的所有 feed 条目打包为 npm 包，内置 MiniSearch 搜索引擎，支持多维度搜索。

## 安装

```bash
npm install dak
```

## 功能

### 1. Feeds — 访问所有 feed 条目

```typescript
import { getFeeds, getFeedsByCategory, getFeedById, getFeedsByTags } from "dak";

// 获取所有条目
const all = getFeeds(); // FeedEntry[]

// 按分类
const finance = getFeedsByCategory("finance");

// 按标签
const macro = getFeedsByTags(["宏观", "经济"]);

// 按 ID
const entry = getFeedById("7705eefeb6d0");

// 按时间范围
import { getFeedsByDateRange } from "dak";
const march = getFeedsByDateRange("2026-03-01", "2026-03-31");

// 获取元信息
import { getCategories, getSources, getAllTags } from "dak";
getCategories(); // ["finance", "news", "social", "tech"]
getSources();    // ["AP News", "Bloomberg Markets", ...]
getAllTags();     // ["中东", "经济", "美国", ...]
```

### 2. Search — 多维度搜索

基于 [MiniSearch](https://lucaong.github.io/minisearch/) 构建，支持：

- **关键词全文搜索**（标题 + 正文，标题权重 3×）
- **属性过滤**：category / source / tags / author / language
- **仅标题搜索**
- **时间范围过滤**
- **模糊匹配 + 前缀匹配**

```typescript
import { createSearchIndex } from "dak";

const index = createSearchIndex();

// 全文搜索
const results = index.search({ query: "inflation" });

// 按分类 + 关键词
const financeResults = index.search({
  query: "oil prices",
  category: "finance",
});

// 按标签 + 时间范围
const filtered = index.search({
  tags: ["经济", "美国"],
  dateFrom: "2026-03-01",
  dateTo: "2026-03-31",
});

// 仅搜索标题
const titleResults = index.search({
  query: "jobs report",
  titleOnly: true,
  limit: 10,
});

// 搜索建议 (自动补全)
index.suggest("inflat");
// ["inflationary inflation", "inflation", "inflationary", "inflated"]

// 索引统计
const stats = index.stats();
// { totalDocuments: 9707, categories: [...], sources: [...], ... }
```

### SearchResult 类型

```typescript
interface SearchResult {
  entry: FeedEntry;      // 匹配的 feed 条目
  score: number;         // 相关度评分
  matchedFields: string[]; // 匹配的字段
}
```

## CLI 工具

安装后可直接使用 `dak` 命令搜索：

```bash
# 全文搜索
dak search "inflation"

# 按分类 + 关键词搜索
dak search "oil price" -c finance --from 2026-03-01

# 仅标题搜索
dak search "AI" --title-only -n 10

# 列出条目
dak feeds -c tech -n 5
dak feeds -t 经济 -t 美国 --content

# 按标签 + 时间搜索
dak search -t 中东 -t 地缘政治 --from 2026-03-01

# 索引统计
dak stats

# 搜索建议
dak suggest "inflat"

# JSON 输出 (便于管道处理)
dak search "tariff" --json | jq '.[0].entry.title'
```

### CLI 选项

| 选项 | 说明 |
|------|------|
| `-c, --category <cat>` | 按分类过滤 |
| `-s, --source <src>` | 按来源过滤 |
| `-t, --tag <tag>` | 按标签过滤 (可多次使用) |
| `-a, --author <author>` | 按作者过滤 |
| `--from <date>` | 发布时间起始 (YYYY-MM-DD) |
| `--to <date>` | 发布时间截止 (YYYY-MM-DD) |
| `--title-only` | 仅搜索标题 |
| `-n, --limit <n>` | 返回数量 (默认 20) |
| `--json` | JSON 格式输出 |
| `--content` | 显示正文摘要 |

## FeedEntry 类型

```typescript
interface FeedEntry {
  id: string;        // 唯一 ID (hash)
  title: string;     // 标题
  source: string;    // 来源名称
  sourceUrl: string; // 来源 URL
  link: string;      // 文章链接
  author: string;    // 作者
  published: string; // 发布时间 (ISO string)
  fetched: string;   // 抓取时间 (ISO string)
  category: string;  // 分类 ID
  tags: string[];    // 标签列表
  language: string;  // 语言
  guid: string;      // RSS GUID
  filename: string;  // 文件名
  content: string;   // 正文 (Markdown)
}
```

## 构建

```bash
cd pkg
bun install

# 从 feeds/ 目录生成 data/feeds.json
bun run build:data

# 编译 TypeScript
bun run build:ts

# 一键构建
bun run build
```

## License

MIT
