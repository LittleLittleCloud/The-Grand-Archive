import type { Context, Next } from "hono";
import type { HonoEnv } from "../types";

/**
 * Reads the `llm.agent` request header (see AGENTS.md) and records whether the
 * caller self-identifies as an LLM/AI agent.
 *
 * Emits one structured JSON log line per API request. Because the Worker has
 * observability logs enabled (wrangler.jsonc → observability.logs.persist), these
 * lines are queryable in Cloudflare Workers Observability, e.g.:
 *
 *   SELECT count() FROM ... WHERE $metadata.message.tag = 'api_request'
 *     AND $metadata.message.llmAgent = true
 *
 * The header is analytics-only: it never affects tier resolution or rate limits.
 */
export function llmAgentMiddleware() {
  return async (c: Context<HonoEnv>, next: Next) => {
    const raw = c.req.header("llm.agent");
    const llmAgent = raw?.trim().toLowerCase() === "true";
    c.set("llmAgent", llmAgent);

    await next();

    // Structured log line — one per API request. `tier` is set by tierMiddleware.
    console.log(
      JSON.stringify({
        tag: "api_request",
        llmAgent,
        method: c.req.method,
        path: new URL(c.req.url).pathname,
        status: c.res.status,
        tier: c.get("tier"),
      })
    );
  };
}
