import type { ExportedHandler } from "@cloudflare/workers-types";
import { getContainer } from "@cloudflare/containers";
import { fetchAllSources, type FetchFn } from "./fetcher";
import { loadSources } from "./config/sources";
import { writeEntries } from "./writer";
import { RsshubContainer } from "./rsshub-container";
import type { Bindings } from "./types";

// The RSSHUB_BASE_URL is a sentinel host; requests to it are routed to the
// bound RSSHub container rather than the public network.
const RSSHUB_INTERNAL_HOST = "rsshub.internal";

/** Route RSSHub feed URLs to the container binding; everything else uses fetch. */
function makeFetchFn(env: Bindings): FetchFn {
  return (url, init) => {
    let host = "";
    try {
      host = new URL(url).hostname;
    } catch {
      // non-absolute URL — fall through to global fetch
    }
    if (host === RSSHUB_INTERNAL_HOST) {
      // Cast works around a @cloudflare/workers-types version skew between this
      // worker and the @cloudflare/containers package.
      const container = getContainer(env.RSSHUB as never, "rsshub");
      return container.fetch(new Request(url, init));
    }
    return fetch(url, init);
  };
}

async function runIngestion(env: Bindings) {
  const start = Date.now();
  const sources = loadSources(env.RSSHUB_BASE_URL);
  console.log(`📡 ${sources.length} sources loaded`);

  const entries = await fetchAllSources(sources, makeFetchFn(env));
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

// Durable Object class backing the RSSHub container binding.
export { RsshubContainer };
