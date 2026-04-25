import { OpenAPIHono, createRoute } from "@hono/zod-openapi";
import { SearchRequestSchema, SearchResponseSchema } from "@dak/contract";
import { search } from "../search/engine";

export const searchRoutes = new OpenAPIHono();

const searchRoute = createRoute({
  method: "get",
  path: "/search",
  summary: "Search news (English & Chinese)",
  description: "Full-text search across all entries. Supports fuzzy and prefix matching with category, source, and date filters.",
  request: { query: SearchRequestSchema },
  responses: {
    200: {
      content: { "application/json": { schema: SearchResponseSchema } },
      description: "Search results",
    },
  },
});

searchRoutes.openapi(searchRoute, (c) => {
  const { q, category, source, from, to, limit, offset } = c.req.valid("query");
  const maxAge = c.get("maxAge") as string | null;
  const tier = (c.get("tier") as "anonymous" | "free" | "premium") ?? "anonymous";

  const result = search(q, { category, source, from, to, maxAge: maxAge ?? undefined, limit, offset });

  return c.json({
    results: result.results,
    total: result.total,
    query: q,
    tier,
    tierCutoff: result.tierFiltered ? maxAge : null,
  }, 200);
});
