import { Hono } from "hono";
import { SearchRequestSchema } from "@dak/contract";
import { search } from "../search/engine";

export const searchRoutes = new Hono();

searchRoutes.get("/search", (c) => {
  const parsed = SearchRequestSchema.safeParse({
    q: c.req.query("q"),
    category: c.req.query("category"),
    source: c.req.query("source"),
    from: c.req.query("from"),
    to: c.req.query("to"),
    limit: c.req.query("limit"),
    offset: c.req.query("offset"),
  });

  if (!parsed.success) {
    return c.json(
      {
        error: "Validation error",
        code: "VALIDATION_ERROR",
        message: parsed.error.issues.map((i) => i.message).join("; "),
      },
      400
    );
  }

  const { q, category, source, from, to, limit, offset } = parsed.data;
  const maxAge = c.get("maxAge") as string | null;
  const tier = c.get("tier") as string;

  const result = search(q, { category, source, from, to, maxAge: maxAge ?? undefined, limit, offset });

  return c.json({
    results: result.results,
    total: result.total,
    query: q,
    tier,
    tierCutoff: result.tierFiltered ? maxAge : null,
  });
});
