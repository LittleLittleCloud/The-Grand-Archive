import type { ExportedHandler } from "@cloudflare/workers-types";
import { fetchAllSources } from "./fetcher";
import { loadSources } from "./config/sources";
import { writeEntries } from "./writer";
import type { Bindings } from "./types";

async function runIngestion(env: Bindings) {
  const start = Date.now();
  const sources = loadSources(env.RSSHUB_BASE_URL);
  console.log(`📡 ${sources.length} sources loaded`);

  const entries = await fetchAllSources(sources);
  console.log(`📦 ${entries.length} entries fetched`);

  const { inserted, duplicates } = await writeEntries(env.DB, entries);
  console.log(
    `✅ [${new Date().toISOString()}] inserted=${inserted} duplicates=${duplicates} (${Date.now() - start}ms)`
  );

  return { sources: sources.length, fetched: entries.length, inserted, duplicates };
}

export default {
  // Cron trigger: */30 * * * * (see wrangler.jsonc)
  async scheduled(_event, env, ctx) {
    ctx.waitUntil(
      runIngestion(env).then(
        () => {},
        (err) => console.error("❌ ingestion run failed:", err)
      )
    );
  },

  // Manual trigger + health for testing/ops.
  async fetch(req, env) {
    const url = new URL(req.url);

    if (url.pathname === "/health") {
      return new Response(JSON.stringify({ status: "ok" }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname === "/run") {
      const token = env.INGEST_TRIGGER_TOKEN;
      if (token && req.headers.get("authorization") !== `Bearer ${token}`) {
        return new Response("unauthorized", { status: 401 });
      }
      const result = await runIngestion(env);
      return Response.json(result);
    }

    return new Response("大案牍库 ingestion worker", { status: 200 });
  },
} satisfies ExportedHandler<Bindings>;
