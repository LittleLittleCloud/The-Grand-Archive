import type { D1Database } from "@cloudflare/workers-types";
import { renderEditionArticle, type DigestContent, type DigestLang } from "@dak/contract";

/** Upsert a generated edition. Idempotent per (date, lang) — re-runs overwrite. */
export async function persistEdition(
  db: D1Database,
  date: string,
  lang: DigestLang,
  content: DigestContent
): Promise<void> {
  const html = renderEditionArticle(content, lang);
  const sections = JSON.stringify(content.sections);
  await db
    .prepare(
      `INSERT INTO digest_editions (date, lang, title, summary, html, sections_json, status)
       VALUES (?, ?, ?, ?, ?, ?, 'published')
       ON CONFLICT(date, lang) DO UPDATE SET
         title = excluded.title,
         summary = excluded.summary,
         html = excluded.html,
         sections_json = excluded.sections_json,
         status = 'published',
         created_at = datetime('now')`
    )
    .bind(date, lang, content.title, content.standfirst, html, sections)
    .run();
}

export interface SubscriberRow {
  email: string;
  unsub_token: string;
}

/** Active, confirmed subscribers for a given language. */
export async function getActiveSubscribers(
  db: D1Database,
  lang: DigestLang
): Promise<SubscriberRow[]> {
  return (
    (
      await db
        .prepare(
          "SELECT email, unsub_token FROM subscribers WHERE status = 'active' AND lang = ?"
        )
        .bind(lang)
        .all<SubscriberRow>()
    ).results ?? []
  );
}
