import { OpenAPIHono, createRoute } from "@hono/zod-openapi";
import { FeedsRequestSchema, FeedsResponseSchema, EntrySchema } from "@dak/contract";
import { z } from "zod";
import { getDb } from "../db/client";

export const feedsRoutes = new OpenAPIHono();

feedsRoutes.get("/feeds/status", (c) => {
  const db = getDb();

  const feeds = db
    .query(
      `SELECT
         source,
         category,
         COUNT(*) as entryCount,
         MIN(published) as earliest,
         MAX(published) as latest,
         MAX(created_at) || 'Z' as lastIngested
       FROM entries
       GROUP BY source
       ORDER BY entryCount DESC`
    )
    .all() as {
    source: string;
    category: string;
    entryCount: number;
    earliest: string | null;
    latest: string | null;
    lastIngested: string | null;
  }[];

  const dailyBins = db
    .query(
      `SELECT
         source,
         date(published) as day,
         COUNT(*) as count
       FROM entries
       WHERE published >= date('now', '-90 days')
       GROUP BY source, date(published)
       ORDER BY source, day`
    )
    .all() as { source: string; day: string; count: number }[];

  return c.json({ feeds, dailyBins });
});

const feedsListRoute = createRoute({
  method: "get",
  path: "/feeds",
  summary: "Browse recent news entries",
  description: "Browse entries with filtering by category, source, and date range. No search query required.",
  request: { query: FeedsRequestSchema },
  responses: {
    200: {
      content: { "application/json": { schema: FeedsResponseSchema } },
      description: "News entries list",
    },
  },
});

feedsRoutes.openapi(feedsListRoute, (c) => {
  const { category, source, from, to, limit, offset } = c.req.valid("query");
  const maxAge = c.get("maxAge") as string | null;
  const db = getDb();

  const conditions: string[] = [];
  const params: (string | number)[] = [];

  if (category) {
    conditions.push("category = ?");
    params.push(category);
  }
  if (source) {
    conditions.push("source = ?");
    params.push(source);
  }
  if (from) {
    conditions.push("published >= ?");
    params.push(from);
  }
  if (to) {
    conditions.push("published <= ?");
    params.push(to + "T23:59:59.999Z");
  }
  if (maxAge) {
    conditions.push("published >= ?");
    params.push(maxAge);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const total = (
    db.query(`SELECT COUNT(*) as count FROM entries ${where}`).get(...params) as { count: number }
  ).count;

  const entries = db
    .query(
      `SELECT * FROM entries ${where} ORDER BY published DESC LIMIT ? OFFSET ?`
    )
    .all(...params, limit, offset);

  // Parse tags JSON for each entry
  const parsed_entries = (entries as Record<string, unknown>[]).map((e) => ({
    ...e,
    tags: e.tags ? JSON.parse(e.tags as string) : [],
  }));

  return c.json({ entries: parsed_entries, total } as any, 200);
});

const feedsGetRoute = createRoute({
  method: "get",
  path: "/feeds/{id}",
  summary: "Get a single entry by ID",
  request: {
    params: z.object({ id: z.string() }),
  },
  responses: {
    200: {
      content: { "application/json": { schema: EntrySchema } },
      description: "Single entry",
    },
  },
});

feedsRoutes.openapi(feedsGetRoute, (c) => {
  const { id } = c.req.valid("param");
  const db = getDb();
  const entry = db.query("SELECT * FROM entries WHERE id = ?").get(id) as Record<string, unknown> | null;

  if (!entry) {
    return c.json({ error: "Not found", code: "NOT_FOUND" } as any, 200);
  }

  return c.json({
    ...entry,
    tags: entry.tags ? JSON.parse(entry.tags as string) : [],
  } as any, 200);
});
