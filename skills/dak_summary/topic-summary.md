````markdown
# Topic Summary

> 父级 skill: [SKILL.md](SKILL.md) — 共享的 Feed 访问、Wikilink 格式、写作风格参见父级文件。

Generate a structured topic-focused summary by searching across daily summaries and raw feeds.

## 1. Clarify the Topic

Identify the topic keyword(s) from the user's request. Examples:
- "伊朗战争" → keywords: `Iran`, `伊朗`, `war`, `战争`, `Hormuz`, `霍尔木兹`
- "AI融资" → keywords: `OpenAI`, `Anthropic`, `融资`, `funding`, `AI`
- "A股回购" → keywords: `A股`, `回购`, `buyback`

Build a keyword set covering both Chinese and English variants, as feeds contain both languages.

## 2. Level-1 Search: Daily Summaries (Priority)

Search `daily_summary/` files first — these are already curated and deduplicated.

```bash
grep -rl "keyword1\|keyword2\|keyword3" daily_summary/
```

For each matching file, read the relevant sections (not the entire file if it's large). Extract:
- The section heading (`## theme name`)
- The summary paragraph
- All wikilinks under that section

**Why Level-1 first:** Daily summaries are curated, deduplicated, and contextually grouped. They provide the highest signal-to-noise ratio. If Level-1 yields sufficient coverage (10+ relevant references across multiple dates), it may be enough on its own.

## 3. Level-2 Search: Raw Feeds (Supplementary)

Proceed to Level-2 if:
- Level-1 returned fewer than 5 relevant references, OR
- The user's topic spans dates not covered by daily summaries, OR
- The user explicitly requests comprehensive/exhaustive coverage

Use `dak` CLI to search feeds by keyword (full-text search across title + content):
```bash
dak search "keyword1 keyword2" --json -n 100
```

Narrow with filters as needed:
```bash
# By category
dak search "keyword" -c finance --json -n 100

# By date range
dak search "keyword" --from 2026-03-01 --to 2026-03-31 --json

# By tag
dak search -t 中东 -t 地缘政治 --json -n 100

# Title-only search (higher precision)
dak search "keyword" --title-only --json -n 100

# Combine multiple filters
dak search "Iran war" -c news --from 2026-03-01 --json -n 100
```

The JSON output includes `entry.content` (full Markdown body), `entry.filename`, `entry.category`, `score`, and `matchedFields` — use these to assess relevance without reading individual files.

For large result sets (50+), work from titles and scores first — read full content only for the most relevant items.

**Deduplication with Level-1:** If a feed post was already referenced in a Level-1 daily summary section, do not double-count it. Skip unless it contains significant additional detail not in the summary.

## 4. Curate and Organize

After collecting references from both levels:

1. **Deduplicate** — same event from multiple sources → keep the most informative one
2. **Sort chronologically** — oldest to newest, to show how the topic evolved
3. **Group into sub-themes** — 3–8 thematic sections depending on breadth
4. **Prioritize** — breaking events > analysis > opinion > peripheral mentions

## 5. Write the Summary

For each sub-theme section, write **3–8 sentences** covering:
- Timeline of key events in chronological order
- Core facts, key actors, and critical numbers
- Cause-and-effect relationships
- Current status and potential outlook (if applicable)

## 6. Output Format

**Filename convention:** Descriptive snake_case name based on the topic.
```
topic_summary/iran_war_2026.md
topic_summary/ai_funding_landscape.md
topic_summary/a_stock_buyback_trend.md
```

Write the file directly (create_file tool or shell).

```markdown
---
topic: 主题名称
created_at: YYYY-MM-DD
updated_at: YYYY-MM-DD
tags:
  - topic-summary
  - related-tag-1
  - related-tag-2
sources:
  daily_summary: N   # number of daily summaries referenced
  feeds: M           # number of raw feed posts referenced
date_range: YYYY-MM-DD ~ YYYY-MM-DD
---

# 主题名称

> 一句话概述该主题的核心要点。

## 子主题一

3–8句中文总结。按时间线梳理事件脉络，聚焦因果关系和关键转折。

- [[daily_summary/YYYY_MM_DD|YYYY-MM-DD 每日总结 § 相关章节]]
- [[feeds/category/YYYY-MM-DD_Title_HASH|Display Title]]

## 子主题二

...

## 总结与展望

对主题当前状态的简要评估，以及可能的后续发展方向（如适用）。
```

When referencing a specific section from a daily summary, append `§ 章节名` to the display text for clarity.

### Frontmatter fields

| Field | Description |
| ----- | ----------- |
| `topic` | Topic name in Chinese |
| `created_at` | Date when this summary was first created |
| `updated_at` | Date when this summary was last modified (update on each revision) |
| `tags` | Always include `topic-summary` plus 2–4 relevant topic tags |
| `sources.daily_summary` | Count of daily summaries referenced |
| `sources.feeds` | Count of raw feed posts referenced |
| `date_range` | Earliest to latest date of referenced material |

## 7. Notes

- If the user asks to **update** an existing topic summary, read the existing file first, then re-run the 2-level search for new material since `updated_at`, merge, and rewrite. Always bump `updated_at`.
- For broad topics (e.g., "伊朗战争"), expect 50–100+ references. Curate to 30–60 representative items across 5–8 sub-themes.
- For narrow topics (e.g., "霍尔木兹海峡通航"), 10–20 references across 2–4 sub-themes is typical.
- The `总结与展望` section is optional — include it only when the topic has a clear trajectory or pending developments.
- When the topic spans a long time range, consider adding a brief timeline at the top of the note for quick orientation.

````
