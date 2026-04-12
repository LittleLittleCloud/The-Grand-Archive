````markdown
# 每日总结 (Daily Summary)

> 大案牍术的应用场景之一。核心三步（海量查询 → 关联分析 → 结果输出）及共享规范参见 [SKILL.md](SKILL.md)。

对某一天的全部 feed 数据进行海量查询、关联分析后，输出结构化每日新闻摘要。

## 1. Discover Posts

Use `dak` CLI to find all feed posts for the target date:
```bash
dak feeds --from YYYY-MM-DD --to YYYY-MM-DD --json -n 500
```

This returns JSON with full `FeedEntry` objects (id, title, source, category, tags, content, link, published, filename, etc.).

For large result sets (300+), work from titles and metadata — they contain enough signal for importance/deduplication judgement.

## 2. Curate: Deduplicate and Prioritize

**Deduplication patterns:**
- Same event from Bloomberg + Reuters + local outlet
- Same 微博 topic appearing as short title + full question format

**Importance signals (high → low):**
- Breaking/developing geopolitical or economic events
- Policy announcements with broad impact (central bank, government, major regulation)
- Major tech releases or security incidents
- Significant market movements with clear cause
- Notable cultural or social events with wide resonance

**Exclude:**
- Pure entertainment/celebrity gossip with no broader significance
- Highly repetitive market micro-updates (e.g., 5 articles all saying "oil rose 0.3%")
- Evergreen lifestyle content with no news angle

## 3. Group Into Themes

Cluster curated posts into 5–8 thematic sections. Name sections concisely in Chinese.

Adjust theme names and count to fit what actually happened that day — don't force empty sections.

## 4. Write Summaries

For each section, write **2–5 sentences** covering:
- The core facts/events
- Why it matters or what changed
- Key actors, numbers, or outcomes

## 5. Output Format

**Output path:** `daily_summary/YYYY_MM_DD.md`

Write the file directly (create_file tool or shell).

```markdown
---
date: YYYY-MM-DD
tags:
  - daily-summary
  - YYYY/MM/DD
---

# YYYY-MM-DD 每日总结

## 主题名称

2–5句中文总结。聚焦核心事实、影响和关键数字。

- [[feeds/category/YYYY-MM-DD_Title_HASH|Display Title]]
- [[feeds/category/YYYY-MM-DD_Title_HASH|Display Title]]

## 下一个主题

...
```

**Tag format:** Date tag uses `/` for nested tag hierarchy — `2026/04/02` creates nested tags `2026` → `04` → `02`.

## 6. Notes

- The filename uses underscores: `2026_04_02.md` (not hyphens)
- For dates with 300+ posts: curate to 30–50 representative items across 6–8 themes
- Prefer `feeds/news/` and `feeds/finance/` for international stories; `feeds/social/` for Chinese trending topics

````
