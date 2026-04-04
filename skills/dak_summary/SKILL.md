---
name: dak_summary
description: Generate summaries using dak CLI. Covers two sub-skills — (A) Daily Summary: generate a daily digest from feed posts ("generate today's summary", "总结今天的新闻", "生成每日总结", "写今天的摘要"); (B) Topic Summary: generate a topic-focused summary by searching feeds ("总结某个话题", "写一下XX的专题总结", "帮我梳理XX事件"). Uses dak for feed search, writes output as Markdown files.
version: 0.1.0
---

# dak_summary Skill

Generate structured summaries from 大案牍库 feed data.

## Sub-skills

| Sub-skill | Trigger | Output | Detail |
| --------- | ------- | ------ | ------ |
| **Daily Summary** | 总结某天的新闻 / generate daily digest | `daily_summary/YYYY_MM_DD.md` | → [daily-summary.md](daily-summary.md) |
| **Topic Summary** | 梳理某个话题 / summarize a topic | `topic_summary/topic_name.md` | → [topic-summary.md](topic-summary.md) |

**When the user's request matches a sub-skill, read the corresponding sub-skill file before proceeding.**

---

## Shared: Feed Access

All feed data access goes through `dak` CLI. Do NOT read `feeds/` markdown files directly.

```bash
# Search by keyword
dak search "keyword" --json -n 100

# List by date range
dak feeds --from YYYY-MM-DD --to YYYY-MM-DD --json -n 500

# Filter by category, tag, source, etc.
dak search "keyword" -c finance -t 经济 --from 2026-03-01 --json
```

See the [dak skill](../dak/SKILL.md) for full CLI reference.

## Shared: Output Structure

```
daily_summary/
└── YYYY_MM_DD.md
topic_summary/
└── topic_name.md
```

Write output files directly using standard file operations (e.g. `cat > file`, shell heredoc, or create_file tool). No special tooling required.

## Shared: Wikilink Format

Always use full path wikilinks with display text:
```
[[feeds/news/2026-04-02_Iran_war_day34_abc123|Iran war: day 34 summary]]
[[daily_summary/2026_04_03|2026-04-03 每日总结 § 伊朗战争]]
```

Use the article's actual title (cleaned up) as display text — not the filename.

## Shared: Writing Style

- Write in Chinese. Be factual and concise.
- No filler phrases like "值得关注的是".
- Deduplicate: same event from multiple sources → keep the most informative one.
