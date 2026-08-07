import { Agent } from "@earendil-works/pi-agent-core";
import {
  DigestContentSchema,
  type DigestContent,
  type DigestLang,
} from "@dak/contract";
import { createLlm, messageText } from "./llm";
import { createTools } from "./tools";
import { extractJson } from "./json";
import type { Bindings, ResearchBrief, BriefItem } from "./types";

const GATHER_SYSTEM = `You are the desk editor for 大案牍库 (The Grand Archive), a daily newspaper.
Your job is to survey today's news from the archive and select the most significant stories.
Use the tools: call list_recent for several categories (finance, news, tech, social, blog, podcast) to see what happened, search_news for specific threads, get_entry or fetch_url when you need more detail.
Select 12–18 notable, diverse stories. Prefer high-signal, distinct stories and avoid near-duplicates.
When finished, output ONLY a JSON object (no prose, no code fences):
{"items":[{"entryId":"<id or null>","title":"<headline>","url":"<url or null>","source":"<source or null>","category":"<category or null>","note":"<one sentence on why it matters>"}]}`;

/** Read the last assistant message's text from a settled agent. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function finalAssistantText(agent: any): string {
  const msgs = agent?.state?.messages;
  if (!Array.isArray(msgs)) return "";
  for (let i = msgs.length - 1; i >= 0; i--) {
    if (msgs[i]?.role === "assistant") {
      const text = messageText(msgs[i]);
      if (text.trim()) return text;
    }
  }
  return "";
}

// Hard ceiling on the whole research step. If the agent stalls (e.g. a provider
// stream that never closes), reject so the Workflow step fails cleanly and
// retries — rather than the Workers runtime canceling a "hung" request.
const GATHER_TIMEOUT_MS = 180_000;

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
  });
  return Promise.race([p.finally(() => clearTimeout(timer)), timeout]);
}

/**
 * Log a concise trace of the agent run — tool calls, tool results, assistant
 * turns — to the worker logs (visible in the `dak: digest` dev terminal locally
 * and via `wrangler tail` in prod). Returns the unsubscribe fn.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function traceAgent(agent: any, label: string): () => void {
  let turn = 0;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return agent.subscribe((event: any) => {
    switch (event.type) {
      case "turn_start":
        console.log(`[${label}] turn ${++turn}`);
        break;
      case "tool_execution_start":
        console.log(`[${label}] → ${event.toolName}(${JSON.stringify(event.args ?? {})})`);
        break;
      case "tool_execution_end": {
        const text =
          event.result?.content?.find((b: any) => b?.type === "text")?.text ?? "";
        const err = event.result?.isError ? " ERROR" : "";
        console.log(
          `[${label}] ← ${event.toolName ?? event.toolCallId}${err} (${String(text).length} chars)`
        );
        break;
      }
      case "message_end":
        if (event.message?.role === "assistant") {
          const t = messageText(event.message).trim();
          if (t) console.log(`[${label}] assistant: ${t.slice(0, 200)}${t.length > 200 ? "…" : ""}`);
        }
        break;
      case "agent_end":
        console.log(`[${label}] done — ${turn} turn(s)`);
        break;
    }
  });
}

/** STEP 1 — the pi agent researches the day and returns a story brief. */
export async function gatherBrief(env: Bindings, date: string): Promise<ResearchBrief> {
  const llm = createLlm(env);
  const agent = new Agent({
    initialState: {
      systemPrompt: GATHER_SYSTEM,
      model: llm.model,
      tools: createTools(env.DB),
    },
    streamFn: llm.streamFn,
  });

  // Attach the trace before prompting so every tool call / turn is logged.
  const untrace = traceAgent(agent, "gather");
  try {
    await withTimeout(
      agent.prompt(
        `Today is ${date} (UTC). Survey the last 24 hours of news and select the day's stories. ` +
          `Start by calling list_recent for the main categories, then dig in where a story looks important.`
      ),
      GATHER_TIMEOUT_MS,
      "gather agent"
    );
  } catch (err) {
    console.error("[gather] agent run failed or timed out:", err);
    // Cancel any in-flight work so nothing is left pending on the isolate.
    try {
      agent.abort?.();
    } catch {
      /* ignore */
    }
  } finally {
    untrace();
  }

  const parsed = extractJson<{ items: BriefItem[] }>(finalAssistantText(agent));
  const items = Array.isArray(parsed?.items) ? parsed!.items.slice(0, 24) : [];
  console.log(`[gather] selected ${items.length} stories for ${date}`);
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
Group the provided stories into 3–6 themed sections (e.g. finance, world, technology, culture). Give the edition a compelling front-page title and a one-paragraph standfirst. For each story write a fresh 2–3 sentence summary in your own words — do not copy source text.
Output ONLY JSON (no prose, no code fences) matching exactly:
{"title":"...","standfirst":"...","sections":[{"heading":"...","blurb":"<optional short section intro or empty>","items":[{"title":"...","summary":"...","url":"<url or null>","source":"<source or null>","entryId":"<id or null>"}]}]}
Preserve url, source and entryId from each input story. Write all prose in ${langName}.${langNote}`;

  const context = {
    systemPrompt: system,
    messages: [
      {
        role: "user" as const,
        content: `Stories for the ${date} edition (JSON):\n${JSON.stringify(brief.items)}`,
        timestamp: Date.now(),
      },
    ],
  };

  const raw = await llm.complete(context);
  const parsed = extractJson<DigestContent>(raw);
  const validated = parsed ? DigestContentSchema.safeParse(parsed) : null;
  if (validated?.success) return validated.data;

  // Fallback: build a plain edition straight from the brief so a run never
  // produces an empty edition even if the model returns unusable output.
  return fallbackEdition(brief, lang, date);
}

function fallbackEdition(brief: ResearchBrief, lang: DigestLang, date: string): DigestContent {
  const byCategory = new Map<string, BriefItem[]>();
  for (const item of brief.items) {
    const key = item.category || (lang === "zh" ? "综合" : "General");
    const list = byCategory.get(key) ?? [];
    list.push(item);
    byCategory.set(key, list);
  }
  const sections = [...byCategory.entries()].map(([heading, items]) => ({
    heading,
    blurb: null,
    items: items.map((it) => ({
      title: it.title,
      summary: it.note || it.title,
      url: it.url ?? null,
      source: it.source ?? null,
      entryId: it.entryId ?? null,
    })),
  }));

  return {
    title: lang === "zh" ? `大案牍库日报 · ${date}` : `DAK Daily · ${date}`,
    standfirst:
      lang === "zh"
        ? "本期由大案牍库自动汇编，收录过去二十四小时的重要新闻。"
        : "Today's dispatch, automatically compiled by The Grand Archive from the past twenty-four hours of news.",
    sections,
  };
}
