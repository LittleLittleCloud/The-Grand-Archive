import { Hono } from "hono";
import { FeedsRequestSchema } from "@dak/contract";
import { getDb } from "../db/client";

export const feedsRoutes = new Hono();

feedsRoutes.get("/feeds", (c) => {
  const parsed = FeedsRequestSchema.safeParse({
    category: c.req.query("category"),
    source: c.req.query("source"),
    from: c.req.query("from"),
    to: c.req.query("to"),
    limit: c.req.query("limit"),
    offset: c.req.query("offset"),
  });

  if (!parsed.success) {
    return c.json(
      { error: "Validation error", code: "VALIDATION_ERROR", message: parsed.error.issues.map((i) => i.message).join("; ") },
      400
    );
  }

  const { category, source, from, to, limit, offset } = parsed.data;
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

  return c.json({ entries: parsed_entries, total });
});

feedsRoutes.get("/feeds/:id", (c) => {
  const id = c.req.param("id");
  const db = getDb();
  const entry = db.query("SELECT * FROM entries WHERE id = ?").get(id) as Record<string, unknown> | null;

  if (!entry) {
    return c.json({ error: "Not found", code: "NOT_FOUND" }, 404);
  }

  return c.json({
    ...entry,
    tags: entry.tags ? JSON.parse(entry.tags as string) : [],
  });
});
