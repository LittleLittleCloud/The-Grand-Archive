import { OpenAPIHono, createRoute } from "@hono/zod-openapi";
import { FeedsRequestSchema, FeedsResponseSchema, EntrySchema } from "@dak/contract";
import { z } from "zod";
import type { HonoEnv } from "../types";

export const feedsRoutes = new OpenAPIHono<HonoEnv>();
const FEEDS_STATUS_CACHE_CONTROL = "public, max-age=300, s-maxage=1800, stale-while-revalidate=600";

feedsRoutes.get("/feeds/status", async (c) => {
  const db = c.env.DB;

  const feeds = (
    await db
      .prepare(
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
      .all<{
        source: string;
        category: string;
        entryCount: number;
        earliest: string | null;
        latest: string | null;
        lastIngested: string | null;
      }>()
  ).results;

  const dailyBins = (
    await db
      .prepare(
        `SELECT
         source,
         date(published) as day,
         COUNT(*) as count
       FROM entries
       WHERE published >= date('now', '-90 days')
       GROUP BY source, date(published)
       ORDER BY source, day`
      )
      .all<{ source: string; day: string; count: number }>()
  ).results;

  c.header("Cache-Control", FEEDS_STATUS_CACHE_CONTROL);
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

feedsRoutes.openapi(feedsListRoute, async (c) => {
  const { category, source, from, to, limit, offset } = c.req.valid("query");
  const maxAge = c.get("maxAge") as string | null;
  const db = c.env.DB;

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
    await db.prepare(`SELECT COUNT(*) as count FROM entries ${where}`).bind(...params).first<{ count: number }>()
  )?.count ?? 0;

  const entries = (
    await db
      .prepare(`SELECT * FROM entries ${where} ORDER BY published DESC LIMIT ? OFFSET ?`)
      .bind(...params, limit, offset)
      .all<Record<string, unknown>>()
  ).results;

  // Parse tags JSON for each entry
  const parsed_entries = entries.map((e) => ({
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

feedsRoutes.openapi(feedsGetRoute, async (c) => {
  const { id } = c.req.valid("param");
  const db = c.env.DB;
  const entry = await db.prepare("SELECT * FROM entries WHERE id = ?").bind(id).first<Record<string, unknown>>();

  if (!entry) {
    return c.json({ error: "Not found", code: "NOT_FOUND" } as any, 200);
  }

  return c.json({
    ...entry,
    tags: entry.tags ? JSON.parse(entry.tags as string) : [],
  } as any, 200);
});
