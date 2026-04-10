```skill
---
name: dak_dev
description: "大案牍库 v2 开发规范 — 6-package Bun monorepo 架构设计、技术栈选型、Auth 方案、数据库与备份策略、API 路由定义、部署流程，以及未来演进路线。"
version: 0.1.0
---

# 大案牍库 v2 — Developer Skill

本 Skill 是 dak v2 重构的完整开发蓝图，涵盖架构、技术栈、实现细节和演进路线。
所有代码实现必须遵循本文档中的约定。

---

## 1. 架构总览

v2 将现有单体仓库拆为 **6 个 Bun workspace 包**，通过 `@dak/contract` 实现类型安全的松耦合。

```
┌─────────────────────────────────────────────┐
│                @dak/contract                │  Zod schemas · TS types · route constants
└────────┬──────────┬──────────┬──────────────┘
         │          │          │
    build-time  build-time  build-time
         │          │          │
   ┌─────▼──┐  ┌───▼───┐  ┌──▼──────────────┐
   │ server │  │  sdk  │  │ ingestion-worker │
   └───┬────┘  └───┬───┘  └────────┬─────────┘
       │           │               │
       │       build-time     runtime HTTP
       │           │          POST /api/entries
   ┌───▼───┐  ┌───▼──┐            │
   │  ui   │  │ cli  │            │
   └───────┘  └──────┘            │
       │                          │
       └──── runtime HTTP ────────┘
             (all query APIs)
```

### 包依赖规则
| 包 | 依赖 | 说明 |
|---|---|---|
| `@dak/contract` | zod | 零运行时依赖，纯类型/schema |
| `@dak/server` | hono, minisearch, @dak/contract | 唯一包含 DB 和搜索引擎的包 |
| `@dak/ui` | react, react-dom, jotai, zustand, @dak/contract | SPA，独立部署，通过 HTTP 调用 server |
| `@dak/sdk` | @dak/contract | fetch-based HTTP client，npm 发布 |
| `@dak/cli` | @dak/sdk | 终端工具，npm 发布 (bin: dak) |
| `@dak/ingestion-worker` | rss-parser, turndown, @dak/contract | 仅依赖 contract，通过 HTTP 上传 |

**关键约束**：
- `ui` 和 `sdk` **不**依赖 `server`（避免引入 sqlite/minisearch）
- `ingestion-worker` **不**依赖 `sdk`（worker 只需 POST，不需要查询能力）
- 所有 API 类型定义集中在 `contract`，其他包通过 `z.infer<>` 派生 TS 类型

---

## 2. 商业策略

四级访问层级，逐步引导用户付费：

| Tier | 数据范围 | Rate Limit | 获取方式 |
|---|---|---|---|
| **Anonymous** | 最近 4 周 | 10 reqs/min | 无需注册 |
| **Free** | 最近 3 个月 | 60 reqs/min | 注册登录 |
| **Premium** | 全部历史数据 | 120 reqs/min | 付费订阅 |
| **Request Pack** | 同当前 plan | 额外配额叠加 | 按次购买 |

### 设计原则
- Anonymous 用户可使用全部功能（搜索、feeds、stats），仅限制数据范围和频率
- 登录即可大幅提升体验（3 个月 + 6× rate limit），降低注册阻力
- Premium 解锁全量历史数据 + 更高 rate limit
- 对于突发高频需求（如批量导出、CI 集成），用户可购买 Request Pack 叠加配额

### Rate Limit 实现
- middleware 根据用户 tier 读取对应配额
- 使用内存计数器（滑动窗口），key = userId 或 IP
- 响应头包含 `X-RateLimit-Limit`、`X-RateLimit-Remaining`、`X-RateLimit-Reset`
- 超限返回 429（见 API 路由章节）

### 数据范围过滤
- middleware 注入 `maxAge` 参数到查询上下文
- Anonymous: `WHERE published >= date('now', '-28 days')`
- Free: `WHERE published >= date('now', '-3 months')`
- Premium / Request Pack: 无时间限制

---

## 3. 技术栈

| 层 | 选型 | 理由 |
|---|---|---|
| Runtime | **Bun** | 内置 SQLite、原生 TS、快速启动 |
| Server | **Hono** | 轻量、可移植 (Bun/Node/CF Workers)、middleware 生态好 |
| Database | **bun:sqlite** | 零额外依赖、WAL 模式、路径 `/data/dak.db` |
| Search | **MiniSearch** | 内存全文索引、title 加权 3×、fuzzy + prefix |
| Auth | **自建** | Bun.password (argon2id) + hono/jwt + crypto.randomUUID |
| Contract | **Zod** | schema = single source of truth，runtime 校验 + 类型推导 |
| SPA | **React + Vite + Tailwind** | 现有 web/ 改造 |
| State | **Jotai + Zustand** | Jotai 管理服务端/派生状态，Zustand 管理客户端 UI 状态 |
| RSS | **rss-parser + turndown** | RSS/Atom 解析 + HTML→Markdown |
| Build | **Bun workspaces** | monorepo，无需 turborepo |
| Backup | **Litestream → Cloudflare R2** | WAL 流式备份，~1s 延迟，零性能损耗 |
| Deploy | **Fly.io** | Volume 挂载 /data，NRT region |

---

## 4. 数据库设计

使用 `bun:sqlite`，WAL 模式，DB 文件路径 `DB_PATH=/data/dak.db`。

### 表结构

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

-- 用户表
CREATE TABLE users (
  id          TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
  username    TEXT UNIQUE NOT NULL,
  email       TEXT UNIQUE,
  password    TEXT NOT NULL,          -- argon2id hash via Bun.password
  role        TEXT DEFAULT 'user',    -- admin | user
  plan        TEXT DEFAULT 'free',    -- free | premium
  req_balance INTEGER DEFAULT 0,      -- 剩余购买请求次数（Request Pack）
  created_at  TEXT DEFAULT (datetime('now'))
);

-- API 密钥表
CREATE TABLE api_keys (
  id          TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
  user_id     TEXT NOT NULL REFERENCES users(id),
  name        TEXT NOT NULL,          -- human label
  prefix      TEXT NOT NULL,          -- key 前 8 字符，用于列表展示
  hash        TEXT NOT NULL,          -- SHA-256 hash of full key
  last_used   TEXT,
  created_at  TEXT DEFAULT (datetime('now'))
);

-- 会话表
CREATE TABLE sessions (
  id          TEXT PRIMARY KEY,       -- JWT jti
  user_id     TEXT NOT NULL REFERENCES users(id),
  expires_at  TEXT NOT NULL,
  created_at  TEXT DEFAULT (datetime('now'))
);
```

### 容量预估
- 当前 ~9,700 条，月增 ~10K
- SQLite 单文件轻松处理 60 万+ 行（数年无压力）
- MiniSearch 内存索引在 ~200K 条时可能达到 ~500MB，届时考虑迁移至 SQLite FTS5

---

## 5. Auth 设计

### 两种认证方式

| 场景 | 方式 | middleware |
|---|---|---|
| SPA 登录 | Cookie-based session (JWT in httpOnly cookie) | `session.ts` |
| SDK / Worker / CI | API Key (Bearer token / X-API-Key header) | `api-key.ts` |

### Auth 流程

```
SPA Login:
  POST /api/auth/login { username, password }
  → Bun.password.verify(password, hash)
  → 生成 JWT (sub=userId, jti=sessionId, exp=7d)
  → Set-Cookie: dak_session=<jwt>; HttpOnly; Secure; SameSite=Strict

API Key:
  POST /api/api-keys { name }         → 生成 UUID key，返回明文（仅此一次）
  请求时: Authorization: Bearer dak_xxxx  或  X-API-Key: dak_xxxx
  → SHA-256(key) → 查 api_keys 表匹配 hash
```

### AuthProvider 接口（未来可换）

```typescript
interface AuthProvider {
  hashPassword(plain: string): Promise<string>;
  verifyPassword(plain: string, hash: string): Promise<boolean>;
  createSession(userId: string): Promise<{ token: string; expiresAt: Date }>;
  verifySession(token: string): Promise<{ userId: string } | null>;
  revokeSession(token: string): Promise<void>;
}
```

初期使用自建实现 (`BunAuthProvider`)，未来可替换为 GitHub OAuth (arctic 库) 或第三方服务。

### 密码重置
- v2 初期：管理员 CLI 命令 `dak admin reset-password <username>`
- 未来：通过 Resend 发送邮件重置

---

## 6. API 路由

所有路由挂载在 Hono app 下，以 `/api` 为前缀。

### 公开路由
| Method | Path | 说明 |
|---|---|---|
| GET | `/api/search?q=&category=&source=&from=&to=` | 全文搜索 |
| GET | `/api/feeds?category=&source=&limit=&offset=` | 按条件列出条目 |
| GET | `/api/feeds/:id` | 单条详情 |
| GET | `/api/stats` | 分类计数、来源统计 |

公开路由对所有用户开放，但按 Tier 施加不同限制（详见「商业策略」章节）：

| Tier | 数据范围 | Rate Limit |
|---|---|---|
| Anonymous | 最近 4 周 | 10 reqs/min |
| Free | 最近 3 个月 | 60 reqs/min |
| Premium | 全部 | 120 reqs/min |
| + Request Pack | 同 plan | 额外配额叠加 |

超限时返回 `429`，响应体引导升级：

```json
{
  "error": "Rate limit exceeded",
  "code": "RATE_LIMITED",
  "message": "Sign in or upgrade your plan for higher limits.",
  "upgrade": "/pricing",
  "limit": 10,
  "reset": 1712567890
}
```

### 需要 Session 认证
| Method | Path | 说明 |
|---|---|---|
| POST | `/api/auth/login` | 登录 |
| POST | `/api/auth/logout` | 登出 (清除 session) |
| GET | `/api/auth/me` | 当前用户信息 |
| POST | `/api/api-keys` | 创建 API key |
| GET | `/api/api-keys` | 列出当前用户的 keys |
| DELETE | `/api/api-keys/:id` | 撤销 key |

### 需要 API Key 认证
| Method | Path | 说明 |
|---|---|---|
| POST | `/api/entries` | 批量写入条目 (ingestion-worker 使用) |

---

## 7. 搜索引擎

MiniSearch 内存索引，启动时从 SQLite 加载全部条目构建。

```typescript
const miniSearch = new MiniSearch({
  fields: ['title', 'content'],
  storeFields: ['title', 'source', 'category', 'published'],
  searchOptions: {
    boost: { title: 3 },
    fuzzy: 0.2,
    prefix: true,
  },
});
```

### 迁移路径
当条目超过 ~200K 时，MiniSearch 内存占用可能达 ~500MB：
1. 切换到 SQLite FTS5（零额外依赖，bun:sqlite 原生支持）
2. 构建 FTS5 虚拟表 + 触发器自动同步
3. 搜索接口保持不变，仅替换 `engine.ts` 内部实现

---

## 8. Ingestion Worker

`@dak/ingestion-worker` 独立运行（cron 或手动触发），流程：

```
sources.yaml          读取订阅源列表
    ↓
fetcher.ts            通过 RSSHub / 直接 RSS 抓取
    ↓
parser.ts             turndown: HTML → Markdown，提取 metadata
    ↓
dedup.ts              content hash 去重
    ↓
uploader.ts           POST /api/entries (带 API Key)
    ↓
@dak/server           写入 SQLite + 更新 MiniSearch 索引
```

### 配置文件
- `sources.yaml` — 订阅源定义 (url, category, tags)
- `categories.yaml` — 分类元数据

---

## 9. 部署

### Fly.io 部署架构

```
Fly.io (NRT region)
├── Volume /data/
│   └── dak.db              SQLite 数据库文件
├── Litestream              sidecar 进程
│   └── WAL → Cloudflare R2  每 ~1s 增量备份
└── @dak/server              Hono + Bun.serve
    └── /static/             @dak/ui 构建产物
```

### Dockerfile（多阶段构建）

```dockerfile
# Stage 1: build
FROM oven/bun:1 AS builder
WORKDIR /app
COPY . .
RUN bun install && bun run build

# Stage 2: runtime
FROM oven/bun:1-slim
RUN apt-get update && apt-get install -y litestream && rm -rf /var/lib/apt/lists/*
COPY --from=builder /app/packages/server/dist /app
COPY --from=builder /app/packages/server/litestream.yml /etc/litestream.yml
CMD ["litestream", "replicate", "-exec", "bun run /app/index.js"]
```

### 环境变量

```env
# Server
DB_PATH=/data/dak.db
JWT_SECRET=<random-32-bytes>
COOKIE_DOMAIN=dak.example.com

# Litestream → R2
R2_REPLICA_URL=s3://dak-backup/dak.db
R2_ACCESS_KEY_ID=<r2-key>
R2_SECRET_ACCESS_KEY=<r2-secret>
R2_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com

# Worker
DAK_SERVER_URL=https://dak.example.com
DAK_API_KEY=dak_xxxxxxxxxxxx

# RSSHub
RSSHUB_BASE_URL=https://rsshub.example.com
```

### Litestream 备份
- **原理**：监视 SQLite WAL 文件，每 ~1 秒将增量变更流式传输到 R2
- **恢复**：`litestream restore -o /data/dak.db s3://dak-backup/dak.db`
- **性能**：近零开销，不影响 SQLite 读写

---

## 10. Monorepo 目录结构

完整目录树见 `doc/REPO_LAYOUT`。关键路径：

```
packages/
├── contract/src/           schemas.ts, types.ts, routes.ts
├── server/src/
│   ├── routes/             search, feeds, stats, ingest, auth
│   ├── middleware/          session, api-key
│   ├── auth/               password, api-key
│   ├── search/engine.ts    MiniSearch
│   └── db/                 schema, client, migrations
├── ui/src/                 React SPA
├── sdk/src/                HTTP client + wrappers
├── cli/src/commands/       search, feeds, stats, suggest
└── ingestion-worker/src/   fetcher, parser, dedup, uploader

config/                     .env.example, rsshub/fly.toml
doc/                        architecture.drawio, REPO_LAYOUT
skills/                     dak, dak_summary, dak_v2
```

---

## 11. UI 设计规范

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
- "大案牍库" feed 使用 Block-Style 布局：日期 (`label-sm`) 在左侧空白列，标题在右侧

**按钮**：
- Primary：`primary` 背景 + `on-primary` 文字 + 直角 + hover 时底部 2px `tertiary` 色条
- Tertiary (Ghost)：无背景 + `primary` 文字 + hover 时 `surface-container-high` 背景

**输入框**：
- 仅下划线样式，默认 `outline` 30% 透明度，focus 时 `primary` 2px 下划线
- Label 使用 `label-md` + `on-surface-variant` 颜色

**Archive Tag（Chips）**：
- 矩形（非圆角药丸）+ `tertiary_container` 背景 + `tertiary_fixed` 文字 → 图书馆目录标签风格

### 交互规范
- 卡片 hover：背景从 `surface` 过渡到 `surface-container-lowest`（"高亮纸张"效果）
- 所有间距遵循 8px 网格
- 以文字标签 (`label-md`) 为主要导航方式，图标不作为主导航

### Tailwind 实现提示
在 `tailwind.config` 中将以上设计 token 映射为 Tailwind 主题变量。例如：

```typescript
// tailwind.config.ts (示意)
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
      borderRadius: {
        DEFAULT: '0px', // 全局直角
      },
      boxShadow: {
        whisper: '0px 12px 32px rgba(28, 28, 24, 0.06)',
      },
    },
  },
};
```

组件中使用 `rounded-none`（或依赖全局 `0px` 默认值），禁止出现 `rounded-md`、`rounded-lg` 等。

### 状态管理（Jotai + Zustand）

**核心原则**：禁止 prop drilling — 组件不接收大量 props / handler，而是直接消费 atom 或 store。

**分工**：

| 库 | 职责 | 示例 |
|---|---|---|
| **Jotai** (atoms) | 服务端数据、派生/计算状态、URL 同步状态 | 搜索结果、feed 列表、当前用户、筛选条件 |
| **Zustand** (stores) | 纯客户端 UI 状态、跨组件共享的交互状态 | sidebar 开关、modal 可见性、表单草稿、滚动位置 |

**Jotai 用法规范**：

```typescript
// atoms/search.ts
import { atom } from 'jotai';
import { atomWithQuery } from 'jotai-tanstack-query'; // 或自定义 async atom

// 原始 atom — URL 搜索参数
export const searchQueryAtom = atom('');
export const categoryFilterAtom = atom<string | null>(null);

// 派生 atom — 自动跟踪依赖
export const searchParamsAtom = atom((get) => ({
  q: get(searchQueryAtom),
  category: get(categoryFilterAtom),
}));

// 异步 atom — 服务端数据
export const searchResultsAtom = atom(async (get) => {
  const params = get(searchParamsAtom);
  const res = await fetch(`/api/search?${new URLSearchParams(params)}`);
  return res.json();
});
```

```typescript
// 组件直接消费 atom，无需 props
import { useAtomValue, useSetAtom } from 'jotai';

function SearchBar() {
  const setQuery = useSetAtom(searchQueryAtom);
  return <input onChange={(e) => setQuery(e.target.value)} />;
}

function ResultsList() {
  const results = useAtomValue(searchResultsAtom);
  return results.map(r => <ResultCard key={r.id} entry={r} />);
}
```

**Zustand 用法规范**：

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

```typescript
// 组件通过 selector 消费，自动优化 re-render
function Sidebar() {
  const open = useUIStore((s) => s.sidebarOpen);
  if (!open) return null;
  return <nav>...</nav>;
}
```

**约束规则**：

1. **禁止 prop drilling** — 若一个 prop 需要穿越 ≥2 层组件传递，必须提升为 atom 或 store
2. **禁止在组件内定义 atom** — 所有 atom 定义在 `atoms/` 目录下的模块文件中
3. **禁止混用** — 服务端/异步数据用 Jotai atom，纯 UI 状态用 Zustand store，不要反过来
4. **组件接口极简** — 组件 props 仅接收该组件独有的「身份标识」（如 `entryId`），其余状态从 atom/store 读取
5. **Zustand 使用 selector** — 始终用 `useStore(s => s.field)` 而非 `useStore()` 解构，避免无关更新触发 re-render

**文件组织**：

```
packages/ui/src/
├── atoms/              # Jotai atoms（按领域分文件）
│   ├── search.ts       # searchQueryAtom, searchResultsAtom, ...
│   ├── feeds.ts        # feedsAtom, categoryAtom, ...
│   └── auth.ts         # currentUserAtom, ...
├── stores/             # Zustand stores（按领域分文件）
│   └── ui.ts           # sidebar, modal, scroll 等 UI 状态
├── components/         # 纯展示组件 + atom/store 消费
├── pages/              # 路由页面
└── ...
```

---

## 12. 开发约定

### 命名
- 包名：`@dak/<name>`（npm scope）
- 文件名：kebab-case (`api-key.ts`)
- 导出：named exports，避免 default export
- schema：PascalCase (`SearchRequest`)，类型用 `z.infer<typeof SearchRequest>`

### 错误处理
- Hono 统一错误 middleware，返回 `{ error: string, code: string }`
- HTTP 状态码：400 (校验), 401 (未认证), 403 (无权限), 404, 500

### 测试
- 使用 `bun:test`
- server 路由测试通过 Hono `app.request()` 无需启动服务器
- sdk/cli 测试 mock HTTP 层

### 代码质量
- TypeScript strict mode
- Zod schema 做 runtime 校验（server 入口 + sdk 响应）
- 无 ORM — 直接写 SQL prepared statements

---

## 13. 本地开发

### 启动

```bash
# 1. 安装依赖（根目录）
bun install

# 2. 启动 server（自动创建 SQLite DB: ./data/dak.db）
cd packages/server && bun run dev
# → http://localhost:3000/health

# 3.（可选）启动 UI（Vite dev proxy /api → :3000）
cd packages/ui && bun run dev
# → http://localhost:5173
```

### 创建管理员 + API Key

DB 初始为空，需手动创建第一个用户：

```bash
bun -e "
import { Database } from 'bun:sqlite';
const db = new Database('./data/dak.db');
const hash = await Bun.password.hash('your-password', { algorithm: 'argon2id' });
db.run('INSERT INTO users (id, username, password, role, plan) VALUES (?, ?, ?, ?, ?)',
  [crypto.randomUUID(), 'admin', hash, 'admin', 'premium']);
console.log('✅ Admin user created');
"
```

然后通过 API 登录并创建 API Key：

```bash
# 登录
curl -c cookies.txt -X POST http://localhost:3000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"your-password"}'

# 创建 API Key
curl -b cookies.txt -X POST http://localhost:3000/api/api-keys \
  -H 'Content-Type: application/json' \
  -d '{"name":"dev"}'
# → 返回 { "key": "dak_xxx...", ... }  ← 仅此一次显示明文
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

## 14. 演进路线

| 阶段 | 内容 |
|---|---|
| **v2.0** | 6-package 拆分、SQLite + MiniSearch、自建 Auth、Litestream 备份 |
| **v2.1** | GitHub OAuth (arctic 库)、用户角色管理 |
| **v2.2** | 搜索引擎优化：MiniSearch → SQLite FTS5（见下方 TODO） |
| **v2.3** | 邮件密码重置 (Resend)、多用户支持 |
| **Future** | AuthProvider 替换 (Clerk/Auth0)、Turso (分布式 SQLite)、Worker 分布式调度、向量语义搜索 |

### TODO: v2.2 搜索引擎迁移 — MiniSearch → SQLite FTS5

**动机**：MiniSearch 在内存中构建索引，14K 条 title-only 索引占 364ms/~200MB，加上 content 需 6.5s/1.6GB。启动时全量 rebuild 导致 Fly.io 首次请求 502。FTS5 索引在磁盘上，启动零开销、零内存。

**方案**：
1. 创建 FTS5 虚拟表（content sync 模式，和 entries 表联动）：
   ```sql
   CREATE VIRTUAL TABLE entries_fts USING fts5(
     title, content,
     content=entries, content_rowid=rowid
   );
   -- 触发器自动同步插入/删除
   ```
2. 搜索查询改为 SQL：`SELECT ... FROM entries_fts WHERE entries_fts MATCH ? ORDER BY rank`
3. 移除 MiniSearch 依赖，删除 `buildSearchIndex()`、`addToIndex()`
4. category/source/date 过滤用 JOIN entries 表
5. 中文分词：`tokenize="unicode61"` 或接 ICU 分词

**基准数据**（14,456 条，本地 M 系列）：
- MiniSearch title-only: 364ms 启动，~200MB
- MiniSearch title+content: 6,517ms 启动，~1.6GB
- FTS5: 0ms 启动，0MB 额外内存

**注意**：FTS5 无内置 fuzzy 匹配，仅支持前缀搜索 (`inflat*`)。若需 typo tolerance 可后续考虑 Meilisearch。
```
