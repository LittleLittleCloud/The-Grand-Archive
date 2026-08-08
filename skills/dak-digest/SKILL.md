---
name: dak-digest
description: "Generate the DAK Daily newspaper digest (en + zh) from the 大案牍库 archive and publish each edition to D1, producing strict JSON that matches the DigestContent schema. Use when asked to build/generate the daily digest, DAK Daily, or 大案牍库日报."
version: 0.1.0
---

# dak-digest Skill

Produce **one refined, newspaper-style edition per language** (`en`, `zh`) for a
given day from the 大案牍库 archive, then **publish** each edition so it appears
in the public archive at `/digest`.

This skill is meant to be driven by the **pi coding agent** running headless in a
container (see the daily job). The agent gathers over the **dak REST API**,
reasons over the day's stories, drafts an editorial edition, and publishes strict
JSON that the server validates against `DigestContentSchema` and upserts into D1.

See [../dak/daily-summary.md](../dak/daily-summary.md) for the curation method
(importance signals, deduplication). All data access is over HTTP with `curl` —
there is **no `dak` CLI** in the container.

---

## Inputs

- `DATE` — target day, `YYYY-MM-DD` (UTC). Default: today.
- `LANGS` — languages to produce. Default: `en,zh`. Each is generated
  **independently** (never translated from the other).

## Tools & environment

All access is over HTTP with `curl` + `jq`. Env: `DAK_SERVER_URL`
(e.g. `https://dak-news.com`), `DAK_API_KEY` (sent as `Authorization: Bearer`).

**dak read API** (JSON):
- `GET {DAK_SERVER_URL}/api/feeds?from=DATE&to=NEXT&limit=100&offset=N` — the
  day's entries. Returns `{ entries: Entry[], total }`. `Entry` carries
  `id, title, content, url, source, category, tags, author, language, published`.
  `limit` maxes at **100** — paginate with `offset` (0, 100, 200, …).
- `GET {DAK_SERVER_URL}/api/search?q=KEYWORD&limit=100[&category=CAT][&from=DATE][&to=NEXT]`
  — full-text search. Returns
  `{ results: [{ id, title, url, source, category, published, score }], total, ... }`.
- `GET {DAK_SERVER_URL}/api/feeds/:id` — one full entry (incl `url`, `content`).
- `GET {DAK_SERVER_URL}/api/stats` — category/source counts (optional context).

**Publish API**:
- `POST {DIGEST_PUBLISH_URL}` with `Authorization: Bearer {DIGEST_PUBLISH_TOKEN}`
  and body `{ "date": DATE, "lang": LANG, "content": <DigestContent> }`.
  The endpoint validates against the schema, renders HTML, and upserts the
  edition into D1 (idempotent per `date,lang`). See "Validate & publish" below.

---

## Procedure

### 1. Gather (broad recall)

Pull the day's material over the REST API. Prefer **not to miss** anything —
over-collect, then curate.

```bash
: "${DAK_SERVER_URL:=https://dak-news.com}"
AUTH="Authorization: Bearer $DAK_API_KEY"
NEXT=$(date -u -d "$DATE + 1 day" +%F 2>/dev/null || date -u -v+1d -j -f %F "$DATE" +%F)

# The day's entries, paginated (limit maxes at 100).
: > /tmp/feeds.json
for OFF in 0 100 200 300 400; do
  curl -fsS -H "$AUTH" \
    "$DAK_SERVER_URL/api/feeds?from=$DATE&to=$NEXT&limit=100&offset=$OFF" \
  | jq -c '.entries[]' >> /tmp/feeds.json || break
done
```

Then run targeted searches for the day's obvious themes, covering **both Chinese
and English keywords** (the archive is bilingual):

```bash
curl -fsS -H "$AUTH" \
  "$DAK_SERVER_URL/api/search?q=<keyword>&limit=100&from=$DATE&to=$NEXT" | jq .
```

Keep the raw JSON — for every story you use you need its `id` (→ `entryId`),
`title`, `url`, and `source`.

### 2. Curate

Deduplicate (same event from multiple sources → keep the most informative),
prioritize, and drop noise. Follow the importance signals in
[../dak/daily-summary.md](../dak/daily-summary.md):

- Keep: breaking geopolitics/economics, policy with broad impact, major tech or
  security events, significant market moves with a clear cause, notable culture.
- Drop: celebrity gossip, repetitive micro-updates, evergreen lifestyle filler.

### 3. Cluster

Group the curated stories into **3–6 themed sections**. Name sections concisely
and in the edition's own language. Do not force empty sections.

### 4. Draft (per language, independently)

Write in an authoritative, elegant broadsheet-newspaper voice. For each
language, compose a cohesive front page:

- A compelling **headline** (never a date placeholder like "DAK Daily · DATE").
- A one-line **deck** (subtitle) and a one-paragraph **standfirst** lead.
- 3–5 "at a glance" **highlights**.
- Optionally one striking **pull-quote** drawn from the material.
- 3–6 **sections**; each with an optional short editorial **body** paragraph and
  2–4 attributed **items**.

**Attribution is mandatory.** Each item's `text` is *your* 1–2 sentence point in
your own words; copy `source`, `url`, and `entryId` from the `dak` entry it draws
from (`entryId` = the entry's `id`). Never invent a URL.

### 5. Emit strict JSON

Write the edition to `edition-<lang>.json` as **JSON only** — no prose, no
markdown, no code fences. It must match this schema exactly:

```jsonc
{
  "title": "string — front-page headline",
  "subtitle": "string | null — one-line deck",
  "standfirst": "string — one-paragraph lead",
  "highlights": ["string", "..."],          // 3–5 items
  "quote": { "text": "string", "source": "string|null", "url": "string|null" } | null,
  "sections": [
    {
      "heading": "string",
      "body": "string | null",              // optional editorial synthesis
      "items": [
        {
          "text": "string — your 1–2 sentence attributed point",
          "source": "string | null",        // from the dak entry
          "url": "string | null",           // from the dak entry
          "entryId": "string | null"        // the dak entry's id
        }
      ]
    }
  ],
  "footerNote": "string | null"
}
```

### 6. Validate & publish

Before publishing, self-check every edition:

- Parses as JSON and matches the schema (required: `title`, `standfirst`, `sections`).
- ≥ 3 sections (≥ 2 acceptable on a thin news day); each section has ≥ 1 item.
- Every item's `entryId` exists in the gathered set; no fabricated URLs.
- Headline is editorial, not a placeholder.

Then publish each language:

```bash
curl -fsS -X POST "$DIGEST_PUBLISH_URL" \
  -H "Authorization: Bearer $DIGEST_PUBLISH_TOKEN" \
  -H "Content-Type: application/json" \
  -d "$(jq -n --arg date "$DATE" --arg lang "$LANG" \
        --slurpfile content "edition-$LANG.json" \
        '{date:$date, lang:$lang, content:$content[0]}')"
```

A `2xx` response means the edition is live in D1 and at `/digest/$DATE/$LANG`.

---

## Language & branding rules

- **en**: newspaper name is `DAK Daily`; masthead `The Grand Archive`.
- **zh**: newspaper name is exactly `大案牍库日报` (brand `大案牍库`). Write **all**
  Chinese in **Simplified** characters only — never Traditional. Reproduce the
  brand characters exactly.

## Failure handling

- If a language has too few stories, still produce a smaller edition (≥ 2
  sections) rather than nothing.
- If publish returns a validation error, read the response, fix the offending
  field in the JSON, and retry. Do not publish invalid or empty editions.
