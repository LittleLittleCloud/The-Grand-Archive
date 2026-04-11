```skill
---
name: dak_dev
description: "大案牍库 v2 开发规范 — 基于 bun-saas-scaffold 的 RSS 聚合/全文搜索平台，包含业务领域定义、搜索引擎、Ingestion Worker、UI 设计体系等 dak 特有约定。"
version: 0.2.0
---

# 大案牍库 v2 — Developer Skill

本 Skill 基于 `bun-saas-scaffold`，仅包含大案牍库特有的业务逻辑和定制。
通用架构（monorepo 结构、Auth、Multi-Tenant、Tier、部署、SDK/CLI 模板等）见 scaffold。

**Scaffold 占位符绑定**：
- `{app}` = `dak`
- `{scope}` = `@dak`
- `{prefix}` = `dak`
- `{appname}` = `dak`

---

## 1. 业务领域 — RSS 聚合与全文搜索

大案牍库是一个多源 RSS 内容聚合平台，核心功能：
- **Ingestion**：从 RSS/Atom 源自动抓取内容，转为 Markdown，去重后写入
- **Search**：中英文全文搜索（SQLite FTS5 + jieba 分词）
- **Feeds**：按分类、来源、时间范围浏览条目
- **Stats**：分类计数、来源统计

### 分类体系
`finance` | `news` | `tech` | `social` | `blog` | `podcast` | `uncategorized`

---

## 2. 额外技术栈（scaffold 之外）

| 层 | 选型 | 理由 |
|---|---|---|
| Search | **SQLite FTS5** + **@node-rs/jieba** | 磁盘索引、零启动开销、中文分词 |
| RSS | **rss-parser + turndown** | RSS/Atom 解析 + HTML→Markdown |
| State | **Jotai + Zustand** | Jotai 管理服务端/派生状态，Zustand 管理客户端 UI 状态 |

---

## 3. 数据库 — dak 业务表

scaffold 已提供 users、api_keys、sessions、tenants、tenant_members 表。
以下是 dak 特有的业务表：

```sql
-- 核心内容表
CREATE TABLE entries (
  id          TEXT PRIMARY KEY,       -- content hash or UUID
  title       TEXT NOT NULL,
  content     TEXT,                   -- Markdown
  url         TEXT,
  source      TEXT NOT NULL,
  category    TEXT NOT NULL,          -- finance | news | tech | social | blog | podcast
  tags        TEXT,                   -- JSON array
  author      TEXT,
  language    TEXT DEFAULT 'en',
  published   TEXT NOT NULL,          -- ISO 8601
  created_at  TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_entries_category ON entries(category);
CREATE INDEX IF NOT EXISTS idx_entries_source ON entries(source);
CREATE INDEX IF NOT EXISTS idx_entries_published ON entries(published);

-- FTS5 全文索引（content sync 模式，与 entries 联动）
CREATE VIRTUAL TABLE IF NOT EXISTS entries_fts USING fts5(
  title, content,
  content=entries, content_rowid=rowid,
  tokenize="unicode61"
);

-- 自动同步触发器
CREATE TRIGGER IF NOT EXISTS entries_ai AFTER INSERT ON entries BEGIN
  INSERT INTO entries_fts(rowid, title, content)
    VALUES (new.rowid, new.title, new.content);
END;
CREATE TRIGGER IF NOT EXISTS entries_ad AFTER DELETE ON entries BEGIN
  INSERT INTO entries_fts(entries_fts, rowid, title, content)
    VALUES('delete', old.rowid, old.title, old.content);
END;
CREATE TRIGGER IF NOT EXISTS entries_au AFTER UPDATE ON entries BEGIN
  INSERT INTO entries_fts(entries_fts, rowid, title, content)
    VALUES('delete', old.rowid, old.title, old.content);
  INSERT INTO entries_fts(rowid, title, content)
    VALUES (new.rowid, new.title, new.content);
END;
```

### 容量预估
- 当前 ~14K 条，月增 ~10K
- SQLite 单文件轻松处理 60 万+ 行（数年无压力）
- FTS5 索引在磁盘上，启动零开销、零额外内存

---

## 4. Contract — dak 业务 Schema

scaffold 已提供 Auth 相关 schema。以下是 dak 特有的业务 schema：

```typescript
import { z } from "zod";

// ─── Entry ──────────────────────────────────────────────

export const EntrySchema = z.object({
  id: z.string(),
  title: z.string(),
  content: z.string().nullable(),
  url: z.string().nullable(),
  source: z.string(),
  category: z.enum([
    "finance", "news", "tech", "social", "blog", "podcast", "uncategorized",
  ]),
  tags: z.array(z.string()).default([]),
  author: z.string().nullable(),
  language: z.string().default("en"),
  published: z.string(),
  created_at: z.string().optional(),
});

export const EntryCreateSchema = EntrySchema.omit({ created_at: true });

// ─── Search ─────────────────────────────────────────────

export const SearchRequestSchema = z.object({
  q: z.string().min(1),
  category: z.string().optional(),
  source: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export const SearchResultSchema = z.object({
  id: z.string(),
  title: z.string(),
  source: z.string(),
  category: z.string(),
  published: z.string(),
  score: z.number(),
});

export const SearchResponseSchema = z.object({
  results: z.array(SearchResultSchema),
  total: z.number(),
  query: z.string(),
  tier: z.enum(["anonymous", "free", "premium"]),
  tierCutoff: z.string().nullable(),
});

// ─── Feeds ──────────────────────────────────────────────

export const FeedsRequestSchema = z.object({
  category: z.string().optional(),
  source: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export const FeedsResponseSchema = z.object({
  entries: z.array(EntrySchema),
  total: z.number(),
});

// ─── Stats ──────────────────────────────────────────────

export const StatsResponseSchema = z.object({
  total: z.number(),
  byCategory: z.array(z.object({ category: z.string(), count: z.number() })),
  bySource: z.array(z.object({ source: z.string(), count: z.number() })),
  lastUpdated: z.string().nullable(),
});

// ─── Ingest ─────────────────────────────────────────────

export const IngestRequestSchema = z.object({
  entries: z.array(EntryCreateSchema).min(1).max(1000),
});

export const IngestResponseSchema = z.object({
  inserted: z.number(),
  duplicates: z.number(),
});
```

### routes.ts — dak 业务路由

```typescript
export const ROUTES = {
  // 业务路由
  SEARCH:      "/api/search",
  FEEDS:       "/api/feeds",
  FEED_BY_ID:  "/api/feeds/:id",
  STATS:       "/api/stats",
  ENTRIES:     "/api/entries",          // ingestion-worker POST

  // Auth 由 Better Auth 处理（/api/auth/** 自动路由）
  // 包括: sign-up/email, sign-in/username, sign-out, get-session 等
  API_KEYS:         "/api/api-keys",       // 自管理
  API_KEY_BY_ID:    "/api/api-keys/:id",
} as const;
```

---

## 5. API 路由 — dak 特有

scaffold 标准 auth/api-keys 路由之外，dak 增加以下：

### 公开路由（按 Tier 限制数据范围和频率）
| Method | Path | 说明 |
|---|---|---|
| GET | `/api/search?q=&category=&source=&from=&to=` | 全文搜索 |
| GET | `/api/feeds?category=&source=&limit=&offset=` | 按条件列出条目 |
| GET | `/api/feeds/:id` | 单条详情 |
| GET | `/api/stats` | 分类计数、来源统计 |

### Tier 数据范围过滤
- middleware 注入 `maxAge` 参数到查询上下文
- Anonymous: `WHERE published >= date('now', '-28 days')`
- Free: `WHERE published >= date('now', '-3 months')`
- Premium: 无时间限制

### 需要 API Key 认证
| Method | Path | 说明 |
|---|---|---|
| POST | `/api/entries` | 批量写入条目 (ingestion-worker 使用) |

---

## 6. 搜索引擎 — SQLite FTS5

使用 SQLite FTS5 磁盘索引，启动零开销、零额外内存。

### 搜索实现

```typescript
// search/fts5.ts
import { getDb } from "../db/client";

export function searchEntries(query: string, options: {
  category?: string;
  source?: string;
  from?: string;
  to?: string;
  maxAge?: string | null;
  limit: number;
  offset: number;
}) {
  const db = getDb();
  const conditions: string[] = [];
  const params: unknown[] = [];

  // FTS5 MATCH
  conditions.push("entries_fts MATCH ?");
  params.push(query);

  // Filters via JOIN
  if (options.category) { conditions.push("e.category = ?"); params.push(options.category); }
  if (options.source) { conditions.push("e.source = ?"); params.push(options.source); }
  if (options.from) { conditions.push("e.published >= ?"); params.push(options.from); }
  if (options.to) { conditions.push("e.published <= ?"); params.push(options.to); }
  if (options.maxAge) { conditions.push("e.published >= ?"); params.push(options.maxAge); }

  const where = conditions.join(" AND ");

  const rows = db.query(`
    SELECT e.id, e.title, e.source, e.category, e.published, rank
    FROM entries_fts
    JOIN entries e ON e.rowid = entries_fts.rowid
    WHERE ${where}
    ORDER BY rank
    LIMIT ? OFFSET ?
  `).all(...params, options.limit, options.offset);

  const total = db.query(`
    SELECT count(*) as count
    FROM entries_fts
    JOIN entries e ON e.rowid = entries_fts.rowid
    WHERE ${where}
  `).get(...params) as { count: number };

  return { rows, total: total.count };
}
```

### 中文分词
- 默认使用 `tokenize="unicode61"` (按 Unicode 字符边界分词)
- 通过 `@node-rs/jieba` native addon 增强中文分词效果
- jieba 在 Dockerfile 中需单独安装 native 依赖

---

## 7. Ingestion Worker

`@dak/ingestion-worker` 独立运行（cron 或手动触发），流程：

```
config/sources.yaml   读取订阅源列表
    ↓
fetcher.ts            通过 RSSHub / 直接 RSS 抓取
    ↓
parser.ts             turndown: HTML → Markdown，提取 metadata
    ↓
dedup.ts              content hash 去重
    ↓
uploader.ts           POST /api/entries (带 API Key)
    ↓
@dak/server           写入 SQLite + FTS5 索引自动同步
```

### 包依赖

```json
{
  "name": "@dak/ingestion-worker",
  "dependencies": {
    "@dak/contract": "workspace:*",
    "rss-parser": "^3.13.0",
    "turndown": "^7.2.0"
  }
}
```

### 配置文件
- `config/sources.yaml` — 订阅源定义 (url, category, tags)
- `config/categories.yaml` — 分类元数据

### 环境变量（worker 特有）

```env
DAK_SERVER_URL=https://dak-server.fly.dev
DAK_API_KEY=dak_xxxxxxxxxxxx
RSSHUB_BASE_URL=https://rsshub.example.com
```

---

## 8. Monorepo 目录结构

完整目录树见 `doc/REPO_LAYOUT`。dak 特有的关键路径：

```
packages/
├── contract/src/           schemas.ts (Entry, Search, Feeds, Stats, Ingest)
├── server/src/
│   ├── routes/
│   │   ├── search.ts       GET  /api/search (FTS5)
│   │   ├── feeds.ts        GET  /api/feeds, /api/feeds/:id
│   │   ├── stats.ts        GET  /api/stats
│   │   ├── ingest.ts       POST /api/entries (api-key-protected)
│   │   └── auth.ts         scaffold 标准 auth 路由
│   ├── middleware/          scaffold 标准 (session, api-key, tier, error)
│   ├── auth/               scaffold 标准 (password, api-key)
│   ├── search/
│   │   ├── fts5.ts         FTS5 搜索实现
│   │   ├── interface.ts    SearchEngine 接口
│   │   └── tokenizer.ts    jieba 分词集成
│   └── db/client.ts        scaffold 标准 + entries 表 + FTS5
├── ui/src/                 React SPA (Digital Curator 设计)
├── sdk/src/                DakClient (search, getFeeds, getStats 等)
├── cli/src/commands/       dak search, dak feeds, dak stats, dak suggest
└── ingestion-worker/src/   fetcher, parser, dedup, uploader

config/
├── sources.yaml            RSS 订阅源定义
└── categories.yaml         分类元数据

doc/                        architecture.drawio, REPO_LAYOUT
skills/                     dak, dak_summary, dak_dev
```

---

## 9. UI 设计规范 — Digital Curator

所有 UI 实现必须遵循 `DESIGN.md`（"Digital Curator" 设计体系）。以下为开发时的关键约束摘要。

### 设计北极星
我们构建的是**数字档案馆**，不是社交 feed。审美追求高端编辑出版物/现代学术图书馆的永恒感，拒绝"滚动内容"的廉价感。布局使用**非对称构图**（大号衬线标题 vs 密集元数据），通过"色调分层"管理信息密度。

### 色彩与表面架构

| Token | 值 | 用途 |
|---|---|---|
| `surface` | `#fcf9f2` | 主阅读区域底色 |
| `surface-dim` | — | 搜索栏等"内凹"区域 |
| `surface-container-low` ~ `highest` | — | 侧边栏、卡片、嵌套层级 |
| `primary` | `#041926` | 主色调、CTA 背景 |
| `primary-container` | `#1a2e3b` | 渐变终点色 |
| `on-primary` | `#ffffff` | primary 上的文字 |
| `secondary` | `#4e6073` | 链接颜色（禁止使用蓝色链接） |
| `tertiary_fixed_dim` | `#e9c176` | primary 背景上的 label 文字（金箔效果） |
| `tertiary_container` | `#3b2900` | Archive Tag 背景 |
| `tertiary_fixed` | `#ffdea5` | Archive Tag 文字 |
| `outline-variant` | `#c3c7cc` | Ghost Border（仅在 15% 透明度下使用） |

**禁止规则**：
- ❌ 禁止使用 `1px solid` 边框分隔内容 → 用背景色切换/色调过渡替代
- ❌ 禁止使用蓝色链接 → 用 `secondary` (#4e6073) 或 `primary` + 1px 下划线
- ❌ 禁止使用 Material Design 标准阴影

**必须规则**：
- ✅ 浮动导航/菜单使用毛玻璃效果：`primary` 85% 不透明度 + `backdrop-blur: 20px`（"磨砂墨水"效果）
- ✅ 主 CTA 和 hero 标题使用 `linear-gradient(135deg, #041926, #1a2e3b)`（"丝绸装帧"效果）
- ✅ 浮动元素使用 Whisper Shadow：`0px 12px 32px rgba(28, 28, 24, 0.06)`
- ✅ 所有圆角 = `0px`（这是设计系统的签名特征，不可妥协）

### 字体体系

| 类别 | Token | 字体 | 尺寸 | 用途 |
|---|---|---|---|---|
| Display | `display-lg` | Newsreader | 3.5rem | 编辑首页大标题 |
| Headline | `headline-md` | Newsreader | 1.75rem | 分区标题、文章标题 |
| Title | `title-md` | Inter | 1.125rem | 子标题、卡片标题 |
| Body | `body-lg` | Inter | 1rem | 长文阅读正文 |
| Label | `label-md` | Work Sans | 0.75rem | 元数据、时间戳、分类 |

- Label 类文字在 `primary` 背景上使用 `tertiary_fixed_dim` (#e9c176)
- Label 使用 `letter-spacing: 0.05em` 增强学术感

### 组件规范

**卡片和列表**：
- 禁止使用分割线 → 使用垂直间距 (`8px` 倍数) 或交替背景色 (`surface` / `surface-container-low`)
- Feed 使用 Block-Style 布局：日期 (`label-sm`) 在左侧空白列，标题在右侧

**按钮**：
- Primary：`primary` 背景 + `on-primary` 文字 + 直角 + hover 时底部 2px `tertiary` 色条
- Tertiary (Ghost)：无背景 + `primary` 文字 + hover 时 `surface-container-high` 背景

**输入框**：
- 仅下划线样式，默认 `outline` 30% 透明度，focus 时 `primary` 2px 下划线

**Archive Tag（Chips）**：
- 矩形（非圆角药丸）+ `tertiary_container` 背景 + `tertiary_fixed` 文字 → 图书馆目录标签风格

### Tailwind 实现

```typescript
// tailwind.config.ts
export default {
  theme: {
    extend: {
      colors: {
        surface: '#fcf9f2',
        primary: '#041926',
        'primary-container': '#1a2e3b',
        'on-primary': '#ffffff',
        secondary: '#4e6073',
        'tertiary-fixed-dim': '#e9c176',
        'tertiary-container': '#3b2900',
        'tertiary-fixed': '#ffdea5',
        'outline-variant': '#c3c7cc',
      },
      fontFamily: {
        display: ['Newsreader', 'serif'],
        headline: ['Newsreader', 'serif'],
        title: ['Inter', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
        label: ['Work Sans', 'sans-serif'],
      },
      borderRadius: { DEFAULT: '0px' },
      boxShadow: { whisper: '0px 12px 32px rgba(28, 28, 24, 0.06)' },
    },
  },
};
```

禁止出现 `rounded-md`、`rounded-lg` 等。

---

## 10. 状态管理 — Jotai + Zustand

**核心原则**：禁止 prop drilling — 组件直接消费 atom 或 store。

### 分工

| 库 | 职责 | 示例 |
|---|---|---|
| **Jotai** (atoms) | 服务端数据、派生/计算状态、URL 同步状态 | 搜索结果、feed 列表、当前用户、筛选条件 |
| **Zustand** (stores) | 纯客户端 UI 状态、跨组件共享的交互状态 | sidebar 开关、modal 可见性、表单草稿 |

### Jotai 用法

```typescript
// atoms/search.ts
import { atom } from 'jotai';

export const searchQueryAtom = atom('');
export const categoryFilterAtom = atom<string | null>(null);

export const searchParamsAtom = atom((get) => ({
  q: get(searchQueryAtom),
  category: get(categoryFilterAtom),
}));

export const searchResultsAtom = atom(async (get) => {
  const params = get(searchParamsAtom);
  const res = await fetch(`/api/search?${new URLSearchParams(params)}`);
  return res.json();
});
```

### Zustand 用法

```typescript
// stores/ui.ts
import { create } from 'zustand';

interface UIStore {
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  activeModal: string | null;
  openModal: (id: string) => void;
  closeModal: () => void;
}

export const useUIStore = create<UIStore>((set) => ({
  sidebarOpen: false,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  activeModal: null,
  openModal: (id) => set({ activeModal: id }),
  closeModal: () => set({ activeModal: null }),
}));
```

### 约束规则

1. **禁止 prop drilling** — 若一个 prop 需穿越 ≥2 层，提升为 atom 或 store
2. **禁止在组件内定义 atom** — 所有 atom 在 `atoms/` 目录下
3. **禁止混用** — 服务端数据用 Jotai，UI 状态用 Zustand
4. **组件接口极简** — props 仅接收「身份标识」（如 `entryId`）
5. **Zustand 用 selector** — `useStore(s => s.field)` 而非解构

### 文件组织

```
packages/ui/src/
├── atoms/              # Jotai atoms
│   ├── search.ts
│   ├── feeds.ts
│   └── auth.ts
├── stores/             # Zustand stores
│   └── ui.ts
├── components/
└── pages/
```

---

## 11. 本地开发

### 启动

```bash
# 安装依赖
bun install

# 启动 server
cd packages/server && bun run dev
# → http://localhost:3000/health

# 启动 UI
cd packages/ui && bun run dev
# → http://localhost:5173
```

### 创建管理员 + API Key

```bash
# 注册用户（Better Auth sign-up）
curl -c cookies.txt -X POST http://localhost:3000/api/auth/sign-up/email \
  -H 'Content-Type: application/json' \
  -H 'Origin: http://localhost:3000' \
  -d '{"email":"admin@dak.local","password":"your-password","name":"admin","username":"admin"}'

# 登录（用户名）
curl -c cookies.txt -X POST http://localhost:3000/api/auth/sign-in/username \
  -H 'Content-Type: application/json' \
  -H 'Origin: http://localhost:3000' \
  -d '{"username":"admin","password":"your-password"}'

# 创建 API Key
curl -b cookies.txt -X POST http://localhost:3000/api/api-keys \
  -H 'Content-Type: application/json' \
  -d '{"name":"dev"}'
```

### 运行 Ingestion Worker

```bash
DAK_SERVER_URL=http://localhost:3000 DAK_API_KEY=dak_xxx \
  bun run packages/ingestion-worker/src/index.ts
```

### CLI

```bash
DAK_SERVER_URL=http://localhost:3000 DAK_API_KEY=dak_xxx \
  bun run packages/cli/src/index.ts search "tariff"
```

---

## 12. 演进路线

| 阶段 | 内容 |
|---|---|
| **v2.0** ✅ | 6-package 拆分、SQLite + MiniSearch、自建 Auth、Litestream 备份 |
| **v2.1** ✅ | 搜索引擎迁移：MiniSearch → SQLite FTS5 + jieba |
| **v2.2** ✅ | Auth 迁移：自建 Auth → Better Auth（username 插件、内置 session、删除 password.ts/session.ts） |
| **v2.3** | Multi-Tenant 支持、GitHub/Google OAuth（Better Auth socialProviders） |
| **Future** | Turso (分布式 SQLite)、Worker 分布式调度、向量语义搜索 |
```
