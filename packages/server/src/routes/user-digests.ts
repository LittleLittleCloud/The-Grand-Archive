import { OpenAPIHono, createRoute } from "@hono/zod-openapi";
import { z } from "zod";
import {
  UserDigestCreateRequestSchema,
  UserDigestUpdateRequestSchema,
  UserDigestShareRequestSchema,
  UserDigestSchema,
  UserDigestListResponseSchema,
  ErrorResponseSchema,
  renderEditionArticle,
  type DigestContent,
  type DigestLang,
  type UserDigest,
  type UserDigestSummary,
} from "@dak/contract";
import type { HonoEnv } from "../types";
import type { Context } from "hono";

export const userDigestRoutes = new OpenAPIHono<HonoEnv>();

// ─── Row mapping ────────────────────────────────────────

interface DigestRow {
  id: string;
  share_id: string;
  author_id: string;
  lang: string;
  date: string;
  title: string;
  summary: string | null;
  content_json: string;
  html: string;
  visibility: string;
  created_at: string;
  updated_at: string;
  published_at: string | null;
}

function toSummary(row: DigestRow): UserDigestSummary {
  return {
    id: row.id,
    shareId: row.share_id,
    lang: row.lang as DigestLang,
    date: row.date,
    title: row.title,
    summary: row.summary,
    visibility: row.visibility as "private" | "public",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    publishedAt: row.published_at,
  };
}

function toUserDigest(row: DigestRow): UserDigest {
  return {
    ...toSummary(row),
    html: row.html,
    content: JSON.parse(row.content_json) as DigestContent,
  };
}

/** Require an authenticated user (session or API key). Returns the id or null. */
function currentUser(c: Context<HonoEnv>): string | null {
  return (c.get("userId") as string | undefined) ?? null;
}

const UNAUTHORIZED = { error: "Unauthorized", code: "AUTH_REQUIRED" } as const;
const NOT_FOUND = { error: "Not found", code: "NOT_FOUND" } as const;

// ─── Schema discovery (self-documenting for agents) ─────

const schemaRoute = createRoute({
  method: "get",
  path: "/digests/schema",
  summary: "Describe the digest content format",
  description:
    "Returns the exact shape a client/agent must POST to /api/digests, plus a worked example. The authoritative machine schema is also in /openapi.json (UserDigestCreateRequest).",
  responses: {
    200: {
      content: { "application/json": { schema: z.object({}).passthrough() } },
      description: "Format description and example",
    },
  },
});

const EXAMPLE_CONTENT: DigestContent = {
  title: "The Grand Dispatch",
  subtitle: "A worked example edition",
  standfirst:
    "A one-paragraph lead that frames the day's stories in your own editorial voice.",
  highlights: [
    "A short at-a-glance bullet.",
    "Another key takeaway.",
    "A third highlight.",
  ],
  quote: { text: "A striking pull-quote.", source: "Some Source", url: null },
  sections: [
    {
      heading: "World",
      body: "Optional short editorial synthesis for the section.",
      items: [
        {
          text: "Your 1-2 sentence attributed point in your own words.",
          source: "Reuters",
          url: "https://example.com/story",
          entryId: null,
        },
      ],
    },
  ],
  footerNote: null,
};

userDigestRoutes.openapi(schemaRoute, (c) => {
  return c.json(
    {
      description:
        "POST /api/digests with a JSON body { lang, date?, content }. `content` must match the DigestContent schema exactly. `lang` is 'en' or 'zh' (default 'en'). `date` is 'YYYY-MM-DD' (UTC); if omitted the creation date is used. Authenticate with a Bearer API key or a logged-in session. Digests are private by default; POST /api/digests/{id}/share to make one publicly shareable via its shareId.",
      request: {
        lang: "en | zh (default en)",
        date: "YYYY-MM-DD (optional)",
        content: "DigestContent — see `example.content`",
      },
      contentSchema: {
        title: "string (required)",
        subtitle: "string | null",
        standfirst: "string (required)",
        highlights: "string[]",
        quote: "{ text: string, source?: string|null, url?: string|null } | null",
        sections:
          "Array<{ heading: string, body?: string|null, items: Array<{ text: string, source?: string|null, url?: string|null, entryId?: string|null }> }> (required)",
        footerNote: "string | null",
      },
      example: { lang: "en", date: "2026-08-07", content: EXAMPLE_CONTENT },
    },
    200
  );
});

// ─── Create ─────────────────────────────────────────────

const createRouteDef = createRoute({
  method: "post",
  path: "/digests",
  summary: "Publish a user digest",
  description:
    "Store a complete, schema-valid newspaper edition produced by your own agent. No server-side LLM is involved — the body is validated against DigestContent, rendered to HTML, and saved as a private digest owned by the authenticated user. Auth: Bearer API key or session.",
  request: {
    body: {
      content: { "application/json": { schema: UserDigestCreateRequestSchema } },
      required: true,
    },
  },
  responses: {
    201: {
      content: { "application/json": { schema: UserDigestSchema } },
      description: "Created digest",
    },
    400: {
      content: { "application/json": { schema: ErrorResponseSchema } },
      description: "Validation error",
    },
    401: {
      content: { "application/json": { schema: ErrorResponseSchema } },
      description: "Authentication required",
    },
  },
});

userDigestRoutes.openapi(createRouteDef, async (c) => {
  const userId = currentUser(c);
  if (!userId) return c.json(UNAUTHORIZED, 401);

  const { lang, date, content } = c.req.valid("json");
  const editionDate = date ?? new Date().toISOString().slice(0, 10);
  const html = renderEditionArticle(content, lang);

  const row = await c.env.DB.prepare(
    `INSERT INTO user_digests (author_id, lang, date, title, summary, content_json, html)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     RETURNING *`
  )
    .bind(
      userId,
      lang,
      editionDate,
      content.title,
      content.standfirst,
      JSON.stringify(content),
      html
    )
    .first<DigestRow>();

  if (!row) return c.json({ error: "Insert failed", code: "DB_ERROR" }, 400);
  return c.json(toUserDigest(row), 201);
});

// ─── Public read (link-only, no auth) ───────────────────

const publicRoute = createRoute({
  method: "get",
  path: "/digests/public/{shareId}",
  summary: "Read a shared (public) digest",
  description:
    "Fetch a digest by its unguessable shareId. Only returns digests whose visibility is 'public'. No authentication required.",
  request: { params: z.object({ shareId: z.string() }) },
  responses: {
    200: {
      content: { "application/json": { schema: UserDigestSchema } },
      description: "The public digest",
    },
    404: {
      content: { "application/json": { schema: ErrorResponseSchema } },
      description: "Not found or not public",
    },
  },
});

userDigestRoutes.openapi(publicRoute, async (c) => {
  const { shareId } = c.req.valid("param");
  const row = await c.env.DB.prepare(
    "SELECT * FROM user_digests WHERE share_id = ? AND visibility = 'public'"
  )
    .bind(shareId)
    .first<DigestRow>();

  if (!row) return c.json(NOT_FOUND, 404);
  c.header("Cache-Control", "public, max-age=300, s-maxage=1800");
  return c.json(toUserDigest(row), 200);
});

// ─── List own digests ───────────────────────────────────

const listRoute = createRoute({
  method: "get",
  path: "/digests",
  summary: "List your digests",
  description: "List the authenticated user's own digests (private and public), newest first.",
  responses: {
    200: {
      content: { "application/json": { schema: UserDigestListResponseSchema } },
      description: "Your digests",
    },
    401: {
      content: { "application/json": { schema: ErrorResponseSchema } },
      description: "Authentication required",
    },
  },
});

userDigestRoutes.openapi(listRoute, async (c) => {
  const userId = currentUser(c);
  if (!userId) return c.json(UNAUTHORIZED, 401);

  const rows =
    (
      await c.env.DB.prepare(
        "SELECT * FROM user_digests WHERE author_id = ? ORDER BY created_at DESC"
      )
        .bind(userId)
        .all<DigestRow>()
    ).results ?? [];

  return c.json({ digests: rows.map(toSummary) }, 200);
});

// ─── Owner-only routes (plain handlers with manual validation) ──

/** GET /digests/:id — read one of your own digests (any visibility). */
userDigestRoutes.get("/digests/:id", async (c) => {
  const userId = currentUser(c);
  if (!userId) return c.json(UNAUTHORIZED, 401);

  const row = await c.env.DB.prepare(
    "SELECT * FROM user_digests WHERE id = ? AND author_id = ?"
  )
    .bind(c.req.param("id"), userId)
    .first<DigestRow>();

  if (!row) return c.json(NOT_FOUND, 404);
  return c.json(toUserDigest(row));
});

/** PATCH /digests/:id — update content, lang, date, and/or visibility. */
userDigestRoutes.patch("/digests/:id", async (c) => {
  const userId = currentUser(c);
  if (!userId) return c.json(UNAUTHORIZED, 401);

  const parsed = UserDigestUpdateRequestSchema.safeParse(
    await c.req.json().catch(() => ({}))
  );
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

  const existing = await c.env.DB.prepare(
    "SELECT * FROM user_digests WHERE id = ? AND author_id = ?"
  )
    .bind(c.req.param("id"), userId)
    .first<DigestRow>();
  if (!existing) return c.json(NOT_FOUND, 404);

  const lang = (parsed.data.lang ?? existing.lang) as DigestLang;
  const date = parsed.data.date ?? existing.date;
  const content =
    parsed.data.content ?? (JSON.parse(existing.content_json) as DigestContent);
  const visibility = parsed.data.visibility ?? existing.visibility;
  const html = renderEditionArticle(content, lang);

  const row = await c.env.DB.prepare(
    `UPDATE user_digests SET
       lang = ?, date = ?, title = ?, summary = ?, content_json = ?, html = ?,
       visibility = ?, updated_at = datetime('now'),
       published_at = CASE WHEN ? = 'public' THEN COALESCE(published_at, datetime('now')) ELSE NULL END
     WHERE id = ? AND author_id = ?
     RETURNING *`
  )
    .bind(
      lang,
      date,
      content.title,
      content.standfirst,
      JSON.stringify(content),
      html,
      visibility,
      visibility,
      c.req.param("id"),
      userId
    )
    .first<DigestRow>();

  if (!row) return c.json(NOT_FOUND, 404);
  return c.json(toUserDigest(row));
});

/** POST /digests/:id/share — flip visibility (public to share, private to unpublish). */
userDigestRoutes.post("/digests/:id/share", async (c) => {
  const userId = currentUser(c);
  if (!userId) return c.json(UNAUTHORIZED, 401);

  const parsed = UserDigestShareRequestSchema.safeParse(
    await c.req.json().catch(() => ({}))
  );
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
  const visibility = parsed.data.visibility;

  const row = await c.env.DB.prepare(
    `UPDATE user_digests SET
       visibility = ?, updated_at = datetime('now'),
       published_at = CASE WHEN ? = 'public' THEN COALESCE(published_at, datetime('now')) ELSE NULL END
     WHERE id = ? AND author_id = ?
     RETURNING *`
  )
    .bind(visibility, visibility, c.req.param("id"), userId)
    .first<DigestRow>();

  if (!row) return c.json(NOT_FOUND, 404);
  return c.json(toUserDigest(row));
});

/** DELETE /digests/:id — delete one of your own digests. */
userDigestRoutes.delete("/digests/:id", async (c) => {
  const userId = currentUser(c);
  if (!userId) return c.json(UNAUTHORIZED, 401);

  const res = await c.env.DB.prepare(
    "DELETE FROM user_digests WHERE id = ? AND author_id = ?"
  )
    .bind(c.req.param("id"), userId)
    .run();

  const deleted = res.meta.changes ?? 0;
  if (deleted === 0) return c.json(NOT_FOUND, 404);
  return c.json({ ok: true });
});
