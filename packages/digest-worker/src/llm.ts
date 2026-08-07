import type { Bindings } from "./types";

// Single-completion client for a Workers AI chat model, called through the
// Cloudflare AI Gateway with a HARD, runtime-enforced timeout.
//
// We deliberately use a direct `fetch` (not the pi-ai SDK) because only
// `fetch` + `AbortSignal.timeout` reliably bounds a model call inside a
// Cloudflare Workflow step: JS timers (setTimeout / Promise.race) do NOT fire
// while a provider `await` is pending in a step, and the SDK did not forward
// the abort signal to its underlying request — so a slow model hung the step
// forever. A direct fetch is aborted by the runtime's I/O layer, guaranteeing
// the caller can fall back to a deterministic edition.

const DEFAULT_MODEL = "workers-ai/@cf/moonshotai/kimi-k2.6";

/** Hard cap on a single model call. On timeout the fetch is aborted and the
 *  caller (draftEdition) falls back to a deterministic edition. */
const LLM_TIMEOUT_MS = 120_000;

export interface LlmMessage {
  role: "user" | "assistant";
  content: string;
}

export interface LlmContext {
  systemPrompt: string;
  messages: LlmMessage[];
}

export interface Llm {
  /** One-shot completion, returns the assistant's text (or throws on
   *  timeout / transport / HTTP error). */
  complete: (context: LlmContext) => Promise<string>;
}

interface WorkersAiResponse {
  result?: { response?: string };
  response?: string;
  choices?: { message?: { content?: string } }[];
}

export function createLlm(env: Bindings, modelIdOverride?: string): Llm {
  const modelId = modelIdOverride ?? env.DIGEST_MODEL ?? DEFAULT_MODEL;
  const accountId = env.CLOUDFLARE_ACCOUNT_ID;
  const gatewayId = env.CLOUDFLARE_GATEWAY_ID;
  const apiKey = env.CLOUDFLARE_API_KEY;

  const complete = async (context: LlmContext): Promise<string> => {
    if (!accountId || !gatewayId || !apiKey) {
      throw new Error(
        "digest: missing CLOUDFLARE_ACCOUNT_ID / CLOUDFLARE_GATEWAY_ID / CLOUDFLARE_API_KEY"
      );
    }

    // modelId already carries the "workers-ai/<model>" provider prefix the
    // gateway path expects, e.g. workers-ai/@cf/moonshotai/kimi-k2.6.
    const url = `https://gateway.ai.cloudflare.com/v1/${accountId}/${gatewayId}/${modelId}`;

    const messages = [
      { role: "system", content: context.systemPrompt },
      ...context.messages.map((m) => ({ role: m.role, content: m.content })),
    ];

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Upstream Workers AI auth + (in case the gateway is authenticated)
        // the gateway auth. The same account API token satisfies both.
        Authorization: `Bearer ${apiKey}`,
        "cf-aig-authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ messages, max_tokens: 4096 }),
      signal: AbortSignal.timeout(LLM_TIMEOUT_MS),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`digest: AI gateway ${res.status}: ${body.slice(0, 300)}`);
    }

    const data = (await res.json()) as WorkersAiResponse;
    const text =
      data.result?.response ??
      data.response ??
      data.choices?.[0]?.message?.content ??
      "";
    return typeof text === "string" ? text : "";
  };

  return { complete };
}
