import { Hono } from "hono";
import {
  DigestSubscribeRequestSchema,
  DigestLangSchema,
  type DigestLang,
  type DigestSection,
} from "@dak/contract";
import { sendAuthEmail } from "../auth/email";
import type { HonoEnv } from "../types";
import type { Context } from "hono";

export const digestRoutes = new Hono<HonoEnv>();

/** Absolute origin of the current request (honours proxy headers). */
function originOf(c: Context<HonoEnv>): string {
  const proto =
    c.req.header("x-forwarded-proto") ?? (c.req.url.startsWith("https") ? "https" : "http");
  const host = c.req.header("host") ?? new URL(c.req.url).host;
  return `${proto}://${host}`;
}

interface ConfirmStrings {
  subject: string;
  heading: string;
  body: string;
  cta: string;
  ignore: string;
}

const CONFIRM_EMAIL: Record<DigestLang, ConfirmStrings> = {
  en: {
    subject: "Confirm your subscription to DAK Daily",
    heading: "One more step",
    body: "Please confirm you would like to receive DAK Daily — The Grand Archive's newspaper-style digest of the day's news.",
    cta: "Confirm subscription",
    ignore: "If you did not request this, you can safely ignore this email.",
  },
  zh: {
    subject: "确认订阅大案牍日报",
    heading: "还差一步",
    body: "请确认您希望订阅大案牍日报——以报纸风格汇编的每日新闻。",
    cta: "确认订阅",
    ignore: "如果这不是您本人的操作，请忽略此邮件。",
  },
};

function confirmEmailHtml(lang: DigestLang, confirmUrl: string): string {
  const t = CONFIRM_EMAIL[lang];
  return `<!DOCTYPE html><html lang="${lang}"><body style="margin:0;background:#f3efe4;padding:24px 12px;">
  <div style="max-width:560px;margin:0 auto;background:#fcf9f2;padding:32px 28px;font-family:'Inter',-apple-system,'Segoe UI',Helvetica,Arial,sans-serif;color:#1a2e3b;">
    <div style="font-family:'Newsreader',Georgia,serif;font-weight:600;font-size:28px;color:#041926;margin:0 0 4px 0;">${lang === "zh" ? "大案牍库" : "The Grand Archive"}</div>
    <h1 style="font-family:'Newsreader',Georgia,serif;font-weight:600;font-size:22px;color:#041926;margin:20px 0 12px 0;">${t.heading}</h1>
    <p style="font-size:15px;line-height:1.6;margin:0 0 24px 0;">${t.body}</p>
    <a href="${confirmUrl}" style="display:inline-block;background:#041926;color:#ffffff;font-size:14px;letter-spacing:0.04em;padding:12px 22px;text-decoration:none;">${t.cta}</a>
    <p style="font-size:12px;line-height:1.6;color:#4e6073;margin:28px 0 0 0;">${t.ignore}</p>
  </div></body></html>`;
}

// ─── Subscribe (double opt-in) ──────────────────────────

digestRoutes.post("/digest/subscribe", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const parsed = DigestSubscribeRequestSchema.safeParse(body);
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

  const email = parsed.data.email.trim().toLowerCase();
  const lang = parsed.data.lang;
  const db = c.env.DB;
  const userId = (c.get("userId") as string | undefined) ?? null;

  const existing = await db
    .prepare("SELECT id, status FROM subscribers WHERE email = ?")
    .bind(email)
    .first<{ id: string; status: string }>();

  if (existing && existing.status === "active") {
    return c.json({
      status: "active" as const,
      message: "You are already subscribed.",
    });
  }

  const confirmToken = crypto.randomUUID();

  if (existing) {
    await db
      .prepare(
        "UPDATE subscribers SET lang = ?, status = 'pending', confirm_token = ?, user_id = COALESCE(?, user_id) WHERE id = ?"
      )
      .bind(lang, confirmToken, userId, existing.id)
      .run();
  } else {
    await db
      .prepare(
        "INSERT INTO subscribers (email, lang, status, confirm_token, user_id) VALUES (?, ?, 'pending', ?, ?)"
      )
      .bind(email, lang, confirmToken, userId)
      .run();
  }

  const confirmUrl = `${originOf(c)}/api/digest/confirm?token=${confirmToken}`;
  await sendAuthEmail(c.env, {
    to: email,
    subject: CONFIRM_EMAIL[lang].subject,
    html: confirmEmailHtml(lang, confirmUrl),
  });

  return c.json({
    status: "pending" as const,
    message: "Almost there — check your inbox to confirm your subscription.",
  });
});

// ─── Confirm (double opt-in link) ───────────────────────

digestRoutes.get("/digest/confirm", async (c) => {
  const token = c.req.query("token");
  const origin = originOf(c);
  if (!token) return c.redirect(`${origin}/digest?error=invalid_token`);

  const sub = await c.env.DB.prepare(
    "SELECT id, lang FROM subscribers WHERE confirm_token = ?"
  )
    .bind(token)
    .first<{ id: string; lang: string }>();

  if (!sub) return c.redirect(`${origin}/digest?error=invalid_token`);

  await c.env.DB.prepare(
    "UPDATE subscribers SET status = 'active', confirmed_at = datetime('now'), confirm_token = NULL WHERE id = ?"
  )
    .bind(sub.id)
    .run();

  return c.redirect(`${origin}/digest?confirmed=1&lang=${sub.lang}`);
});

// ─── Unsubscribe ────────────────────────────────────────

digestRoutes.get("/digest/unsubscribe", async (c) => {
  const token = c.req.query("token");
  const origin = originOf(c);
  if (!token) return c.redirect(`${origin}/digest?error=invalid_token`);

  const sub = await c.env.DB.prepare(
    "SELECT id FROM subscribers WHERE unsub_token = ?"
  )
    .bind(token)
    .first<{ id: string }>();

  if (!sub) return c.redirect(`${origin}/digest?error=invalid_token`);

  await c.env.DB.prepare(
    "UPDATE subscribers SET status = 'unsubscribed', unsubscribed_at = datetime('now') WHERE id = ?"
  )
    .bind(sub.id)
    .run();

  return c.redirect(`${origin}/digest?unsubscribed=1`);
});

// ─── Public archive: list editions ──────────────────────

digestRoutes.get("/digest/editions", async (c) => {
  const langParam = c.req.query("lang");
  const lang = DigestLangSchema.safeParse(langParam);
  const limit = Math.min(Number(c.req.query("limit")) || 60, 200);

  let stmt;
  if (lang.success) {
    stmt = c.env.DB.prepare(
      "SELECT date, lang, title, summary FROM digest_editions WHERE status = 'published' AND lang = ? ORDER BY date DESC LIMIT ?"
    ).bind(lang.data, limit);
  } else {
    stmt = c.env.DB.prepare(
      "SELECT date, lang, title, summary FROM digest_editions WHERE status = 'published' ORDER BY date DESC, lang LIMIT ?"
    ).bind(limit);
  }

  const editions = (await stmt.all()).results ?? [];
  c.header("Cache-Control", "public, max-age=300, s-maxage=1800");
  return c.json({ editions });
});

// ─── Public archive: single edition ─────────────────────

digestRoutes.get("/digest/editions/:date/:lang", async (c) => {
  const date = c.req.param("date");
  const langParsed = DigestLangSchema.safeParse(c.req.param("lang"));
  if (!langParsed.success) {
    return c.json({ error: "Not found", code: "NOT_FOUND" }, 404);
  }

  const row = await c.env.DB.prepare(
    "SELECT date, lang, title, summary, html, sections_json, created_at FROM digest_editions WHERE date = ? AND lang = ? AND status = 'published'"
  )
    .bind(date, langParsed.data)
    .first<{
      date: string;
      lang: DigestLang;
      title: string;
      summary: string | null;
      html: string;
      sections_json: string | null;
      created_at: string;
    }>();

  if (!row) return c.json({ error: "Not found", code: "NOT_FOUND" }, 404);

  let sections: DigestSection[] = [];
  if (row.sections_json) {
    try {
      sections = JSON.parse(row.sections_json) as DigestSection[];
    } catch {
      sections = [];
    }
  }

  c.header("Cache-Control", "public, max-age=600, s-maxage=3600");
  return c.json({
    date: row.date,
    lang: row.lang,
    title: row.title,
    summary: row.summary,
    html: row.html,
    sections,
    created_at: row.created_at,
  });
});

// ─── Admin: trigger a digest run from the UI ────────────
// Gated by INGEST_ALLOWED_USERS (same admin list as ingest). The server calls
// the digest worker's token-guarded /run endpoint, which starts the Workflow.

export function isDigestAdmin(c: Context<HonoEnv>): Promise<boolean> {
  const allowed = (c.env.INGEST_ALLOWED_USERS ?? "").split(",").filter(Boolean);
  const userId = c.get("userId") as string | undefined;
  if (!userId) return Promise.resolve(false);
  if (allowed.includes(userId)) return Promise.resolve(true);
  return c.env.DB.prepare("SELECT role FROM users WHERE id = ?")
    .bind(userId)
    .first<{ role: string | null }>()
    .then((row) => row?.role === "admin");
}

/** Capability check so the UI can show/hide the admin control. */
digestRoutes.get("/admin/digest", async (c) => {
  return c.json({ canTrigger: await isDigestAdmin(c) });
});

/** Result of asking the digest worker to build + publish an edition. */
export type DigestRunResult =
  | { ok: true; data: Record<string, unknown> }
  | { ok: false; code: "NOT_CONFIGURED" | "TRIGGER_FAILED" | "TRIGGER_UNREACHABLE"; error: string; status: 502 | 503 };

/** Ask the digest worker to run (and publish) a digest. Caller must authorize. */
export async function triggerDigestRun(
  c: Context<HonoEnv>,
  options: { date?: string; lang?: string } = {}
): Promise<DigestRunResult> {
  const base = c.env.DIGEST_WORKER_URL;
  const token = c.env.DIGEST_TRIGGER_TOKEN;
  if (!base || !token) {
    return { ok: false, code: "NOT_CONFIGURED", error: "Digest trigger not configured", status: 503 };
  }

  const target = new URL(`${base.replace(/\/$/, "")}/run`);
  if (options.date) target.searchParams.set("date", options.date);
  if (options.lang === "en" || options.lang === "zh") target.searchParams.set("lang", options.lang);

  try {
    const res = await fetch(target.toString(), {
      method: "GET",
      headers: { authorization: `Bearer ${token}` },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, code: "TRIGGER_FAILED", error: "Digest worker rejected the run", status: 502 };
    }
    return { ok: true, data: data as Record<string, unknown> };
  } catch {
    return { ok: false, code: "TRIGGER_UNREACHABLE", error: "Could not reach the digest worker", status: 502 };
  }
}

/** Kick off a digest run (defaults to today, both languages). */
digestRoutes.post("/admin/digest/run", async (c) => {
  if (!(await isDigestAdmin(c))) {
    return c.json({ error: "Forbidden", code: "NOT_ALLOWED" }, 403);
  }

  const body = (await c.req.json().catch(() => ({}))) as { date?: string; lang?: string };
  const result = await triggerDigestRun(c, { date: body.date, lang: body.lang });
  if (!result.ok) {
    return c.json({ error: result.error, code: result.code }, result.status);
  }
  return c.json(result.data);
});
