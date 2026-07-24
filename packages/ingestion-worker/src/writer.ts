import type { D1Database } from "@cloudflare/workers-types";
import type { EntryCreate } from "@dak/contract";
import { tokenize } from "./tokenizer";

const CHUNK = 100;

/**
 * Insert entries directly into D1 (INSERT OR IGNORE for dedup) and populate the
 * FTS index for newly inserted rows with jieba-tokenized title/body — mirrors
 * the server's /api/entries logic so ingestion can write D1 without the server.
 */
export async function writeEntries(
  db: D1Database,
  entries: EntryCreate[]
): Promise<{ inserted: number; duplicates: number }> {
  if (entries.length === 0) return { inserted: 0, duplicates: 0 };

  let inserted = 0;
  let duplicates = 0;
  const insertedEntries: EntryCreate[] = [];

  const buildInsert = (e: EntryCreate) =>
    db
      .prepare(
        `INSERT OR IGNORE INTO entries (id, title, content, url, source, category, tags, author, language, published)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        e.id,
        e.title,
        e.content ?? null,
        e.url ?? null,
        e.source,
        e.category,
        JSON.stringify(e.tags),
        e.author ?? null,
        e.language ?? "en",
        e.published
      );

  for (let i = 0; i < entries.length; i += CHUNK) {
    const chunk = entries.slice(i, i + CHUNK);
    const results = await db.batch(chunk.map(buildInsert));
    results.forEach((r, j) => {
      if (r.meta.changes > 0) {
        inserted++;
        insertedEntries.push(chunk[j]!);
      } else {
        duplicates++;
      }
    });
  }

  // Populate FTS for the newly inserted entries.
  for (let i = 0; i < insertedEntries.length; i += CHUNK) {
    const chunk = insertedEntries.slice(i, i + CHUNK);
    const stmts = [];
    for (const e of chunk) {
      const row = await db
        .prepare("SELECT rowid FROM entries WHERE id = ?")
        .bind(e.id)
        .first<{ rowid: number }>();
      if (!row) continue;
      stmts.push(
        db
          .prepare("INSERT INTO entries_fts(rowid, title, body) VALUES (?, ?, ?)")
          .bind(row.rowid, tokenize(e.title), tokenize(e.content ?? ""))
      );
    }
    if (stmts.length > 0) await db.batch(stmts);
  }

  return { inserted, duplicates };
}
