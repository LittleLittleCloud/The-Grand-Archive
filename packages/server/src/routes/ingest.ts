import { Hono } from "hono";
import { IngestRequestSchema } from "@dak/contract";
import { requireApiKey } from "../middleware/api-key";
import { addToIndex, buildSearchIndex } from "../search/engine";
import type { IndexedEntry } from "../search/interface";
import type { HonoEnv } from "../types";

export const ingestRoutes = new Hono<HonoEnv>();

ingestRoutes.post("/entries", requireApiKey(), async (c) => {
  const allowedUsers = (c.env.INGEST_ALLOWED_USERS ?? "").split(",").filter(Boolean);
  const userId = c.get("userId") as string;
  if (!allowedUsers.includes(userId)) {
    return c.json({ error: "Forbidden", code: "INGEST_NOT_ALLOWED" }, 403);
  }

  const body = await c.req.json();
  const parsed = IngestRequestSchema.safeParse(body);

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

  const db = c.env.DB;
  const entries = parsed.data.entries;

  const stmts = entries.map((entry) =>
    db
      .prepare(
        `INSERT OR IGNORE INTO entries (id, title, content, url, source, category, tags, author, language, published)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        entry.id,
        entry.title,
        entry.content ?? null,
        entry.url ?? null,
        entry.source,
        entry.category,
        JSON.stringify(entry.tags),
        entry.author ?? null,
        entry.language ?? "en",
        entry.published
      )
  );

  const results = stmts.length > 0 ? await db.batch(stmts) : [];

  let inserted = 0;
  let duplicates = 0;
  const newEntries: IndexedEntry[] = [];
  results.forEach((r, i) => {
    if (r.meta.changes > 0) {
      inserted++;
      const e = entries[i]!;
      newEntries.push({
        id: e.id,
        title: e.title,
        content: e.content ?? "",
        source: e.source,
        category: e.category,
        published: e.published,
      });
    } else {
      duplicates++;
    }
  });

  // Update FTS index with newly inserted entries
  await addToIndex(db, newEntries);

  return c.json({ inserted, duplicates });
});

// Rebuild the entire FTS index from the entries table. Used once after a bulk
// data import (e.g. the R2→D1 migration) since FTS needs jieba (worker-only).
ingestRoutes.post("/admin/reindex", requireApiKey(), async (c) => {
  const allowedUsers = (c.env.INGEST_ALLOWED_USERS ?? "").split(",").filter(Boolean);
  const userId = c.get("userId") as string;
  if (!allowedUsers.includes(userId)) {
    return c.json({ error: "Forbidden", code: "INGEST_NOT_ALLOWED" }, 403);
  }

  const indexed = await buildSearchIndex(c.env.DB);
  return c.json({ ok: true, indexed });
});
