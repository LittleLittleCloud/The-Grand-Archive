import {
  DigestContentSchema,
  type DigestContent,
  type DigestLang,
} from "@dak/contract";
import { createLlm } from "./llm";
import { extractJson } from "./json";
import type { Bindings, ResearchBrief, BriefItem } from "./types";

/**
 * STEP 1 - deterministic research: pull the day's most recent stories straight
 * from the D1 archive, spread across categories. The LLM/agent tool-calling
 * loop proved unreliable at prod scale, so gather is now deterministic and the
 * model is used only to DRAFT the edition from these stories.
 */
export async function gatherBrief(env: Bindings, date: string): Promise<ResearchBrief> {
  const rows =
    (
      await env.DB.prepare(
        `SELECT id, title, url, source, category, substr(content, 1, 300) AS snippet
         FROM entries
         WHERE published >= datetime('now', '-24 hours')
         ORDER BY published DESC
         LIMIT 400`
      ).all<{
        id: string;
        title: string;
        url: string | null;
        source: string | null;
        category: string | null;
        snippet: string | null;
      }>()
    ).results ?? [];

  // Spread the selection: up to 3 per category, ~12 total, newest first. Keep
  // the brief small so the draft model can synthesise the whole edition well
  // within its time budget.
  const perCategory = new Map<string, BriefItem[]>();
  for (const r of rows) {
    const cat = r.category || "news";
    const list = perCategory.get(cat) ?? [];
    if (list.length < 3) {
      list.push({
        entryId: r.id,
        title: r.title,
        url: r.url,
        source: r.source,
        category: cat,
        note: r.snippet ? String(r.snippet).slice(0, 160) : "",
      });
    }
    perCategory.set(cat, list);
  }
  const items = [...perCategory.values()].flat().slice(0, 14);
  console.log(`[gather] deterministic: ${items.length} stories from ${rows.length} recent entries for ${date}`);
  return { date, items };
}

const LANG_NAME: Record<DigestLang, string> = {
  en: "English",
  zh: "Chinese (简体中文)",
};

/** STEP 2 — draft one localized newspaper edition from the shared brief. */
export async function draftEdition(
  env: Bindings,
  brief: ResearchBrief,
  lang: DigestLang,
  date: string
): Promise<DigestContent> {
  const llm = createLlm(env);
  const langName = LANG_NAME[lang] ?? LANG_NAME.en;

  const langNote =
    lang === "zh"
      ? " IMPORTANT: write ALL Chinese text in Simplified Chinese only — never use Traditional characters. The newspaper name is fixed as 「大案牍库」; reproduce those exact characters."
      : "";

  const system = `You are the editor of 大案牍库 (The Grand Archive) daily newspaper. Write the ${date} edition in ${langName}, in an authoritative, elegant broadsheet-newspaper voice.
Craft ONE cohesive front-page edition from the provided stories:
- title: a compelling front-page headline.
- subtitle: a short one-line deck under the headline.
- standfirst: a one-paragraph lead that frames the day.
- highlights: 3-5 short "at a glance" bullet strings.
- quote: optional - one striking pull-quote drawn from the material, with a short source label when clear (or null).
- sections: 3-5 themed sections (e.g. finance, world, technology, culture). Each has a heading, an optional short "body" paragraph of your own editorial synthesis, and "items": 2-4 attributed points. Each item's "text" is your 1-2 sentence point in your own words; set "entryId" to that story's id from the input (its source and link are attached automatically - never invent a url).
Output ONLY JSON (no prose, no code fences) matching exactly:
{"title":"...","subtitle":"...","standfirst":"...","highlights":["..."],"quote":{"text":"...","source":"...|null"},"sections":[{"heading":"...","body":"...","items":[{"text":"...","entryId":"..."}]}],"footerNote":"...|null"}
Write all prose in ${langName}.${langNote}`;

  const forModel = brief.items.map((it) => ({
    entryId: it.entryId,
    title: it.title,
    note: it.note,
    category: it.category,
  }));

  const context = {
    systemPrompt: system,
    messages: [
      {
        role: "user" as const,
        content: `Stories for the ${date} edition (JSON):\n${JSON.stringify(forModel)}`,
      },
    ],
  };

  try {
    const raw = await llm.complete(context);
    const parsed = extractJson<DigestContent>(raw);
    const validated = parsed ? DigestContentSchema.safeParse(parsed) : null;
    if (validated?.success) return enrichAttribution(validated.data, brief);
    console.warn(`[draft] ${lang}: model output failed validation, using fallback`);
  } catch (err) {
    console.error(`[draft] ${lang}: model call failed, using fallback:`, err);
  }

  // Fallback: build a plain edition straight from the brief so a run never
  // produces an empty edition even if the model returns unusable output.
  return fallbackEdition(brief, lang, date);
}

/**
 * Authoritatively backfill each item's source/url from the brief using the
 * model-supplied entryId. Models are unreliable at copying attribution
 * verbatim, so we trust only the entryId and inject the real source/url the
 * gather step already captured. Items without a matching entryId keep whatever
 * the model returned (or null).
 */
function enrichAttribution(content: DigestContent, brief: ResearchBrief): DigestContent {
  const byId = new Map<string, BriefItem>();
  for (const it of brief.items) {
    if (it.entryId) byId.set(it.entryId, it);
  }

  const sections = content.sections.map((section) => ({
    ...section,
    items: section.items.map((item) => {
      const match = item.entryId ? byId.get(item.entryId) : undefined;
      if (!match) return item;
      return {
        ...item,
        source: match.source ?? item.source ?? null,
        url: match.url ?? item.url ?? null,
        entryId: match.entryId,
      };
    }),
  }));

  return { ...content, sections };
}

export function fallbackEdition(brief: ResearchBrief, lang: DigestLang, date: string): DigestContent {
  const byCategory = new Map<string, BriefItem[]>();
  for (const item of brief.items) {
    const key = item.category || (lang === "zh" ? "综合" : "General");
    const list = byCategory.get(key) ?? [];
    list.push(item);
    byCategory.set(key, list);
  }
  const sections = [...byCategory.entries()].map(([heading, items]) => ({
    heading,
    body: null,
    items: items.map((it) => ({
      text: it.note || it.title,
      source: it.source ?? null,
      url: it.url ?? null,
      entryId: it.entryId ?? null,
    })),
  }));

  return {
    title: lang === "zh" ? `大案牍库日报 · ${date}` : `DAK Daily · ${date}`,
    standfirst:
      lang === "zh"
        ? "本期由大案牍库自动汇编，收录过去二十四小时的重要新闻。"
        : "Today's dispatch, automatically compiled by The Grand Archive from the past twenty-four hours of news.",
    subtitle: null,
    highlights: brief.items.slice(0, 5).map((it) => it.title),
    quote: null,
    sections,
    footerNote: null,
  };
}
