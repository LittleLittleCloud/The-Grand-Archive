import { Hono } from "hono";
import { IngestRequestSchema } from "@dak/contract";
import { requireApiKey } from "../middleware/api-key";
import { getDb } from "../db/client";
import { addToIndex } from "../search/engine";

export const ingestRoutes = new Hono();

ingestRoutes.post("/entries", requireApiKey(), async (c) => {
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

  const db = getDb();
  const insert = db.prepare(`
    INSERT OR IGNORE INTO entries (id, title, content, url, source, category, tags, author, language, published)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  let inserted = 0;
  let duplicates = 0;

  const insertMany = db.transaction((entries: typeof parsed.data.entries) => {
    for (const entry of entries) {
      const result = insert.run(
        entry.id,
        entry.title,
        entry.content,
        entry.url,
        entry.source,
        entry.category,
        JSON.stringify(entry.tags),
        entry.author,
        entry.language,
        entry.published
      );
      if (result.changes > 0) {
        inserted++;
      } else {
        duplicates++;
      }
    }
  });

  insertMany(parsed.data.entries);

  // Update search index with newly inserted entries
  const newEntries = parsed.data.entries
    .filter((e) => {
      // Only include entries that were actually inserted
      const row = db.query("SELECT id FROM entries WHERE id = ?").get(e.id);
      return row !== null;
    })
    .map((e) => ({
      id: e.id,
      title: e.title,
      content: e.content ?? "",
      source: e.source,
      category: e.category,
      published: e.published,
    }));

  addToIndex(newEntries);

  return c.json({ inserted, duplicates });
});
