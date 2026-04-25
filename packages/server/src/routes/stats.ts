import { OpenAPIHono, createRoute } from "@hono/zod-openapi";
import { StatsResponseSchema } from "@dak/contract";
import { getDb } from "../db/client";

export const statsRoutes = new OpenAPIHono();

const statsRoute = createRoute({
  method: "get",
  path: "/stats",
  summary: "Get database statistics",
  description: "Returns total entry count, breakdown by category and source, and last updated timestamp.",
  responses: {
    200: {
      content: { "application/json": { schema: StatsResponseSchema } },
      description: "Database statistics",
    },
  },
});

statsRoutes.openapi(statsRoute, (c) => {
  const db = getDb();

  const total = (
    db.query("SELECT COUNT(*) as count FROM entries").get() as { count: number }
  ).count;

  const byCategory = db
    .query(
      "SELECT category, COUNT(*) as count FROM entries GROUP BY category ORDER BY count DESC"
    )
    .all() as { category: string; count: number }[];

  const bySource = db
    .query(
      "SELECT source, COUNT(*) as count FROM entries GROUP BY source ORDER BY count DESC"
    )
    .all() as { source: string; count: number }[];

  const lastUpdated = (
    db.query("SELECT MAX(created_at) as last FROM entries").get() as { last: string | null }
  ).last;

  return c.json({ total, byCategory, bySource, lastUpdated }, 200);
});
