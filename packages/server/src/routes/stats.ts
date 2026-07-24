import { OpenAPIHono, createRoute } from "@hono/zod-openapi";
import { StatsResponseSchema } from "@dak/contract";
import type { HonoEnv } from "../types";

export const statsRoutes = new OpenAPIHono<HonoEnv>();

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

statsRoutes.openapi(statsRoute, async (c) => {
  const db = c.env.DB;

  const total = (
    await db.prepare("SELECT COUNT(*) as count FROM entries").first<{ count: number }>()
  )?.count ?? 0;

  const byCategory = (
    await db
      .prepare(
        "SELECT category, COUNT(*) as count FROM entries GROUP BY category ORDER BY count DESC"
      )
      .all<{ category: string; count: number }>()
  ).results;

  const bySource = (
    await db
      .prepare(
        "SELECT source, COUNT(*) as count FROM entries GROUP BY source ORDER BY count DESC"
      )
      .all<{ source: string; count: number }>()
  ).results;

  const lastUpdated = (
    await db.prepare("SELECT MAX(created_at) as last FROM entries").first<{ last: string | null }>()
  )?.last ?? null;

  return c.json({ total, byCategory, bySource, lastUpdated }, 200);
});
