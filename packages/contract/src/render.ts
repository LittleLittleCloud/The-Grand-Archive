import type { DigestContent, DigestLang } from "./types";

// ─── Newspaper renderer ─────────────────────────────────
// Pure functions that turn a structured DigestContent into HTML. Shared by the
// server (web archive view) and the digest worker (email). Styling follows the
// "Digital Curator" design language in DESIGN.md — Newsreader serif headlines,
// parchment surfaces, ink navy, gold-leaf labels, 0px radius. Styles are
// inlined so they survive email clients that strip <style> blocks.

const INK = "#041926";
const INK_SOFT = "#1a2e3b";
const PARCHMENT = "#fcf9f2";
const PARCHMENT_DIM = "#f3efe4";
const GOLD = "#b8860b";
const MUTED = "#4e6073";
const HAIRLINE = "#d8d2c4";
const ACCENT = "#6f5a44";

const SERIF = "'Newsreader', Georgia, 'Times New Roman', serif";
const SANS = "'Inter', -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif";

interface Strings {
  tagline: string;
  inThisIssue: string;
  tldr: string;
  readMore: string;
  viewInBrowser: string;
  unsubscribe: string;
  unsubscribeNote: string;
  masthead: string;
}

const STRINGS: Record<DigestLang, Strings> = {
  en: {
    masthead: "The Grand Archive",
    tagline: "DAK Daily",
    inThisIssue: "In this issue",
    tldr: "At a glance",
    readMore: "Read the full story →",
    viewInBrowser: "View in browser",
    unsubscribe: "Unsubscribe",
    unsubscribeNote: "You are receiving this because you subscribed to DAK Daily.",
  },
  zh: {
    masthead: "大案牍库",
    tagline: "大案牍库日报",
    inThisIssue: "本期要目",
    tldr: "本期要点",
    readMore: "阅读全文 →",
    viewInBrowser: "在浏览器中查看",
    unsubscribe: "退订",
    unsubscribeNote: "您收到本邮件是因为您订阅了大案牍库日报。",
  },
};

export function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Only allow http(s) URLs through to href attributes. */
function safeUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (u.protocol === "http:" || u.protocol === "https:") return u.toString();
  } catch {
    /* not a valid absolute URL */
  }
  return null;
}

/** Human date label, e.g. "Thursday, 6 August 2026" / "2026年8月6日 星期四". */
export function formatDateLabel(date: string, lang: DigestLang): string {
  const d = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return date;
  const locale = lang === "zh" ? "zh-CN" : "en-GB";
  return new Intl.DateTimeFormat(locale, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(d);
}

/**
 * Render the article body of an edition (standfirst + sections). This is what
 * gets stored in `digest_editions.html` and reused for both the web archive and
 * the email body.
 */
export function renderEditionArticle(content: DigestContent, lang: DigestLang): string {
  const t = STRINGS[lang] ?? STRINGS.en;

  const subtitle = content.subtitle
    ? `<p style="font-family:${SERIF};font-size:20px;line-height:1.4;font-weight:600;color:${INK};margin:0 0 14px 0;">${escapeHtml(content.subtitle)}</p>`
    : "";

  const standfirst = `<p style="font-family:${SERIF};font-size:19px;font-style:italic;line-height:1.6;color:${INK_SOFT};margin:0 0 24px 0;border-left:4px solid ${ACCENT};padding-left:16px;">${escapeHtml(content.standfirst)}</p>`;

  // TL;DR highlights box (newspaper-brief "highlights").
  const highlights =
    content.highlights && content.highlights.length
      ? `
      <div style="border:2px solid ${INK};background:${PARCHMENT_DIM};padding:14px 18px;margin:0 0 28px 0;">
        <div style="font-family:${SANS};font-size:11px;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;color:${ACCENT};margin:0 0 8px 0;">${escapeHtml(t.tldr)}</div>
        <ul style="margin:0;padding-left:18px;">${content.highlights
          .map(
            (h) =>
              `<li style="font-family:${SANS};font-size:14px;line-height:1.6;color:${INK_SOFT};margin:0 0 6px 0;">${escapeHtml(h)}</li>`
          )
          .join("")}</ul>
      </div>`
      : "";

  const sections = content.sections
    .map((section) => {
      const body = section.body
        ? `<p style="font-family:${SANS};font-size:14px;line-height:1.7;color:${INK_SOFT};text-align:justify;margin:0 0 12px 0;">${escapeHtml(section.body)}</p>`
        : "";
      const items = section.items
        .map((item) => {
          const href = safeUrl(item.url);
          let attribution = "";
          if (item.source) {
            attribution = href
              ? ` <a href="${escapeHtml(href)}" style="color:${ACCENT};text-decoration:none;border-bottom:1px solid ${GOLD};">— ${escapeHtml(item.source)}</a>`
              : ` <span style="color:${ACCENT};">— ${escapeHtml(item.source)}</span>`;
          } else if (href) {
            attribution = ` <a href="${escapeHtml(href)}" style="color:${ACCENT};text-decoration:none;border-bottom:1px solid ${GOLD};">${escapeHtml(t.readMore)}</a>`;
          }
          return `<li style="font-family:${SANS};font-size:14px;line-height:1.7;color:${INK_SOFT};margin:0 0 10px 0;">${escapeHtml(item.text)}${attribution}</li>`;
        })
        .join("");
      const list = items ? `<ul style="margin:0;padding-left:18px;">${items}</ul>` : "";
      return `
        <section style="margin:26px 0 0 0;border-top:2px solid ${INK};padding-top:16px;">
          <h2 style="font-family:${SERIF};font-weight:700;font-size:22px;line-height:1.2;letter-spacing:-0.01em;margin:0 0 10px 0;color:${INK};">${escapeHtml(section.heading)}</h2>
          ${body}
          ${list}
        </section>`;
    })
    .join("");

  let quote = "";
  if (content.quote && content.quote.text) {
    const q = content.quote;
    const href = safeUrl(q.url);
    const src = q.source
      ? `<footer style="font-family:${SANS};font-size:12px;letter-spacing:0.04em;color:${MUTED};margin-top:8px;">— ${
          href
            ? `<a href="${escapeHtml(href)}" style="color:${MUTED};">${escapeHtml(q.source)}</a>`
            : escapeHtml(q.source)
        }</footer>`
      : "";
    quote = `
      <blockquote style="margin:30px 0 0 0;border-left:4px solid ${INK};padding:4px 0 4px 18px;">
        <p style="font-family:${SERIF};font-style:italic;font-size:21px;line-height:1.5;color:${INK};margin:0;">“${escapeHtml(q.text)}”</p>
        ${src}
      </blockquote>`;
  }

  const footer = content.footerNote
    ? `<p style="font-family:${SANS};font-size:12px;line-height:1.6;color:${MUTED};margin:26px 0 0 0;">${escapeHtml(content.footerNote)}</p>`
    : "";

  return `
    <div style="max-width:660px;margin:0 auto;">
      ${subtitle}
      ${standfirst}
      ${highlights}
      ${sections}
      ${quote}
      ${footer}
    </div>`;
}

interface EmailOptions {
  lang: DigestLang;
  date: string;
  unsubUrl: string;
  viewUrl: string;
}

/**
 * Wrap an edition in a full HTML email document with masthead + footer. Uses a
 * table-free, inline-styled layout for broad email-client support.
 */
export function renderEditionEmail(content: DigestContent, opts: EmailOptions): string {
  const t = STRINGS[opts.lang] ?? STRINGS.en;
  const dateLabel = formatDateLabel(opts.date, opts.lang);
  const article = renderEditionArticle(content, opts.lang);
  return `<!DOCTYPE html>
<html lang="${opts.lang}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="light" />
  <title>${escapeHtml(content.title)}</title>
</head>
<body style="margin:0;padding:0;background:${PARCHMENT_DIM};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(content.standfirst)}</div>
  <div style="background:${PARCHMENT_DIM};padding:24px 12px;">
    <div style="max-width:680px;margin:0 auto;background:${PARCHMENT};padding:32px 28px;">
      <div style="text-align:center;padding:0 0 8px 0;">
        <a href="${escapeHtml(opts.viewUrl)}" style="font-family:${SANS};font-size:11px;letter-spacing:0.08em;color:${MUTED};text-decoration:none;">${escapeHtml(t.viewInBrowser)}</a>
      </div>
      <div style="text-align:center;border-bottom:3px double ${INK};border-top:3px double ${INK};padding:14px 0;margin:0 0 6px 0;">
        <div style="font-family:${SERIF};font-weight:600;font-size:40px;letter-spacing:0.02em;color:${INK};line-height:1;">${escapeHtml(t.masthead)}</div>
        <div style="font-family:${SANS};font-size:11px;letter-spacing:0.28em;text-transform:uppercase;color:${GOLD};margin-top:8px;">${escapeHtml(t.tagline)}</div>
      </div>
      <div style="text-align:center;font-family:${SANS};font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:${MUTED};padding:8px 0 4px 0;">${escapeHtml(dateLabel)}</div>
      <h1 style="font-family:${SERIF};font-weight:600;font-size:30px;line-height:1.2;text-align:center;color:${INK};margin:12px 0 20px 0;">${escapeHtml(content.title)}</h1>
      ${article}
      <div style="border-top:1px solid ${HAIRLINE};margin-top:32px;padding-top:16px;text-align:center;">
        <p style="font-family:${SANS};font-size:12px;line-height:1.6;color:${MUTED};margin:0 0 8px 0;">${escapeHtml(t.unsubscribeNote)}</p>
        <a href="${escapeHtml(opts.unsubUrl)}" style="font-family:${SANS};font-size:12px;letter-spacing:0.04em;color:${MUTED};text-decoration:underline;">${escapeHtml(t.unsubscribe)}</a>
      </div>
    </div>
  </div>
</body>
</html>`;
}
