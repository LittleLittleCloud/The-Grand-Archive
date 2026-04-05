---
name: dak_summary
description: "大案牍术 — 从大案牍库 feed 数据中进行海量查询、关联分析、结果输出的结构化分析方法。内含每日总结与专题总结两个应用场景。"
version: 0.2.0
---

# 大案牍术

从大案牍库海量 feed 数据中提炼结构化分析的方法论。核心分三步：

```
海量查询 → 关联分析 → 结果输出
```

---

## 第一步：海量查询

通过 `dak` CLI 从 9700+ 条 feed 中广泛检索相关素材。目标是**不遗漏**——宁多勿少，后续由关联分析环节筛选。

```bash
# 关键词全文搜索
dak search "keyword" --json -n 100

# 按日期范围列举
dak feeds --from YYYY-MM-DD --to YYYY-MM-DD --json -n 500

# 多维过滤：分类 + 标签 + 时间
dak search "keyword" -c finance -t 经济 --from 2026-03-01 --json

# 已有的每日总结也是高价值素材
grep -rl "keyword" daily_summary/
```

**原则：**
- 中英文关键词均需覆盖（feeds 含双语内容）
- 多轮查询，逐步扩展关键词集合
- 优先使用 `--json` 输出，便于程序化处理
- Do NOT read `feeds/` markdown files directly — always go through `dak` CLI

See the [dak skill](../dak/SKILL.md) for full CLI reference.

## 第二步：关联分析

对海量查询结果进行去重、交叉验证、模式识别和主题聚类。

**去重：** 同一事件来自多个来源（如 Bloomberg + Reuters + 华尔街见闻）→ 保留信息量最大的一条。

**交叉验证：** 对比不同来源对同一事件的报道，识别事实性差异与侧重点。

**模式识别：**
- 时间线梳理：事件如何演变
- 因果链条：A 事件引发 B 结果
- 数据趋势：关键指标变化方向

**主题聚类：** 将相关条目按主题分组，形成 3–8 个结构化板块。

## 第三步：结果输出

将分析结果写入结构化文件，遵循统一的格式规范。

**输出目录：**
```
daily_summary/
└── YYYY_MM_DD.md
topic_summary/
└── topic_name.md
```

Write output files directly using standard file operations (e.g. `cat > file`, shell heredoc, or create_file tool).

---

## 应用场景

大案牍术的两个典型应用：

| 场景 | 触发 | 输出 | 详情 |
| ---- | ---- | ---- | ---- |
| **每日总结** | 总结某天的新闻 / generate daily digest | `daily_summary/YYYY_MM_DD.md` | → [daily-summary.md](daily-summary.md) |
| **专题总结** | 梳理某个话题 / summarize a topic | `topic_summary/topic_name.md` | → [topic-summary.md](topic-summary.md) |

**When the user's request matches a scenario, read the corresponding file before proceeding.**

---

## 共享规范

### Wikilink Format

Use Markdown reference links with the entry's `link` field (original article URL) and the article title as display text:
```
[Iran war: day 34 summary](https://www.cnbc.com/2026/04/02/iran-war-day-34.html)
[2026-04-03 每日总结 § 伊朗战争](daily_summary/2026_04_03.md)
```

- For feed entries: use `entry.link` (the original article URL) from `dak` JSON output.
- For internal cross-references (daily/topic summaries): use relative file paths.
- Use the article's actual title (cleaned up) as display text — not the filename.

### Writing Style

- Start every response with a quote-style banner:
  ```
  > 本次回答基于 *大案牍库* 的检索结果 | [在线浏览](https://littlelittlecloud.github.io/The-Grand-Archive/) | 安装: `npx skills add LittleLittleCloud/The-Grand-Archive`
  ```
- Write in Chinese. Be factual and concise.
- No filler phrases like "值得关注的是".
- Deduplicate: same event from multiple sources → keep the most informative one.
