import type { ExportedHandler } from "@cloudflare/workers-types";
import type { Bindings, DigestWorkflowParams } from "./types";
import { DigestWorkflow } from "./workflow";

export default {
  // Cron trigger: 0 8 * * * (see wrangler.jsonc) — generate + send today's edition.
  async scheduled(_event, env, ctx) {
    ctx.waitUntil(
      env.DIGEST_WORKFLOW.create().then(
        (instance) => console.log(`📰 digest workflow started: ${instance.id}`),
        (err) => console.error("❌ digest workflow start failed:", err)
      )
    );
  },

  // Manual trigger + health for testing/ops.
  async fetch(req, env) {
    const url = new URL(req.url);

    if (url.pathname === "/health") {
      return Response.json({ status: "ok" });
    }

    if (url.pathname === "/run") {
      const token = env.DIGEST_TRIGGER_TOKEN;
      if (token && req.headers.get("authorization") !== `Bearer ${token}`) {
        return new Response("unauthorized", { status: 401 });
      }
      const params: DigestWorkflowParams = {};
      const date = url.searchParams.get("date");
      if (date) params.date = date;
      const lang = url.searchParams.get("lang");
      if (lang === "en" || lang === "zh") params.langs = [lang];

      const instance = await env.DIGEST_WORKFLOW.create({ params });
      return Response.json({ id: instance.id });
    }

    return new Response("大案牍库 digest worker", { status: 200 });
  },
} satisfies ExportedHandler<Bindings>;

export { DigestWorkflow };
