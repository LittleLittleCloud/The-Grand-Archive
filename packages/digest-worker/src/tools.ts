import { Type } from "@earendil-works/pi-ai";
import type { AgentTool } from "@earendil-works/pi-agent-core";
import type { D1Database } from "@cloudflare/workers-types";

// Tools the research agent can call while assembling the day's edition. All are
// backed by the shared D1 archive; `fetch_url` reaches the open web only for
// URLs that already appear in the news data.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Tool = AgentTool<any>;

function textResult(value: unknown): {
  content: { type: "text"; text: string }[];
  details: Record<string, never>;
} {
  return { content: [{ type: "text", text: JSON.stringify(value) }], details: {} };
}

/** Reject obviously-internal hosts to limit SSRF from the fetch_url tool. */
function isBlockedHost(host: string): boolean {
  const h = host.toLowerCase();
  return (
    h === "localhost" ||
    h.endsWith(".local") ||
    h.endsWith(".internal") ||
    /^(127\.|10\.|192\.168\.|169\.254\.|::1|0\.0\.0\.0)/.test(h) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(h)
  );
}

export function createTools(db: D1Database): Tool[] {
  const listRecent: Tool = {
    name: "list_recent",
    label: "List recent news",
    description:
      "List recent news entries, newest first, optionally filtered by category, within the last N hours. Use this to survey the day's news across categories.",
    parameters: Type.Object({
      category: Type.Optional(
        Type.String({ description: "One of: finance, news, tech, social, blog, podcast" })
      ),
      hours: Type.Optional(Type.Number({ description: "Look-back window in hours (default 24, max 72)" })),
      limit: Type.Optional(Type.Number({ description: "Max entries (default 30, max 60)" })),
    }),
    execute: async (_id, params) => {
      const p = params as { category?: string; hours?: number; limit?: number };
      const hours = Math.min(Math.max(Number(p.hours) || 24, 1), 72);
      const limit = Math.min(Math.max(Number(p.limit) || 30, 1), 60);
      const clauses = ["published >= datetime('now', ?)"];
      const binds: (string | number)[] = [`-${hours} hours`];
      if (p.category) {
        clauses.push("category = ?");
        binds.push(String(p.category));
      }
      binds.push(limit);
      const rows =
        (
          await db
            .prepare(
              `SELECT id, title, url, source, category, published, substr(content, 1, 400) AS snippet
               FROM entries WHERE ${clauses.join(" AND ")} ORDER BY published DESC LIMIT ?`
            )
            .bind(...binds)
            .all()
        ).results ?? [];
      return textResult(rows);
    },
  };

  const searchNews: Tool = {
    name: "search_news",
    label: "Search news",
    description:
      "Search recent news entries by keyword (matches title and body). Use for finding specific topics within the last few days.",
    parameters: Type.Object({
      query: Type.String({ description: "Keyword or phrase to search for" }),
      limit: Type.Optional(Type.Number({ description: "Max results (default 20, max 40)" })),
    }),
    execute: async (_id, params) => {
      const p = params as { query?: string; limit?: number };
      const query = String(p.query ?? "").trim();
      if (!query) return textResult([]);
      const limit = Math.min(Math.max(Number(p.limit) || 20, 1), 40);
      const like = `%${query}%`;
      const rows =
        (
          await db
            .prepare(
              `SELECT id, title, url, source, category, published, substr(content, 1, 400) AS snippet
               FROM entries
               WHERE (title LIKE ? OR content LIKE ?) AND published >= datetime('now', '-4 days')
               ORDER BY published DESC LIMIT ?`
            )
            .bind(like, like, limit)
            .all()
        ).results ?? [];
      return textResult(rows);
    },
  };

  const getEntry: Tool = {
    name: "get_entry",
    label: "Get entry",
    description: "Fetch the full stored content of a single news entry by its id.",
    parameters: Type.Object({
      id: Type.String({ description: "Entry id" }),
    }),
    execute: async (_id, params) => {
      const p = params as { id?: string };
      const row = await db
        .prepare(
          "SELECT id, title, url, source, category, published, content FROM entries WHERE id = ?"
        )
        .bind(String(p.id ?? ""))
        .first<{ content: string | null; [k: string]: unknown }>();
      if (!row) throw new Error(`entry not found: ${p.id}`);
      return textResult({ ...row, content: String(row.content ?? "").slice(0, 4000) });
    },
  };

  const fetchUrl: Tool = {
    name: "fetch_url",
    label: "Fetch URL",
    description:
      "Fetch the readable text of an http(s) URL that appeared in the news data, to get more detail. Only use URLs already present in entries.",
    parameters: Type.Object({
      url: Type.String({ description: "An http(s) URL taken from a news entry" }),
    }),
    execute: async (_id, params) => {
      const p = params as { url?: string };
      let u: URL;
      try {
        u = new URL(String(p.url ?? ""));
      } catch {
        throw new Error("invalid url");
      }
      if (u.protocol !== "http:" && u.protocol !== "https:") {
        throw new Error("only http(s) urls are allowed");
      }
      if (isBlockedHost(u.hostname)) throw new Error("host not allowed");
      const res = await fetch(u.toString(), {
        headers: { "user-agent": "dak-digest/1.0 (+https://dak-news.com)" },
        signal: AbortSignal.timeout(10_000),
      });
      const raw = await res.text();
      const text = raw
        .replace(/<script[\s\S]*?<\/script>/gi, " ")
        .replace(/<style[\s\S]*?<\/style>/gi, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 4000);
      return textResult({ url: u.toString(), status: res.status, text });
    },
  };

  return [listRecent, searchNews, getEntry, fetchUrl];
}
