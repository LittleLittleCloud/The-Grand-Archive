import { renderEditionEmail, type DigestContent, type DigestLang } from "@dak/contract";
import { getActiveSubscribers } from "./store";
import type { Bindings } from "./types";

const SUBJECT_PREFIX: Record<DigestLang, string> = {
  en: "DAK Daily",
  zh: "大案牍日报",
};

const FROM_NAME: Record<DigestLang, string> = {
  en: "The Grand Archive",
  zh: "大案牍库",
};

/**
 * Fan out one edition to every active subscriber of that language. Each email
 * carries a personalized unsubscribe link. For < ~100 subscribers a simple loop
 * over the send_email binding is sufficient.
 *
 * NOTE: the send_email binding wrapper used across this repo does not expose
 * custom headers, so we rely on the in-body unsubscribe link (no
 * List-Unsubscribe header). Revisit if/when volume warrants a batch ESP.
 */
export async function sendEdition(
  env: Bindings,
  date: string,
  lang: DigestLang,
  content: DigestContent
): Promise<{ recipients: number; sent: number }> {
  const subs = await getActiveSubscribers(env.DB, lang);
  if (subs.length === 0) return { recipients: 0, sent: 0 };

  const base = (env.PUBLIC_BASE_URL ?? "https://dak-news.com").replace(/\/$/, "");
  const viewUrl = `${base}/digest/${date}/${lang}`;
  const from = env.EMAIL_FROM ?? "dispatch@dak-news.com";
  const fromName = FROM_NAME[lang] ?? FROM_NAME.en;
  const subject = `${SUBJECT_PREFIX[lang] ?? SUBJECT_PREFIX.en} · ${content.title}`;

  let sent = 0;
  for (const sub of subs) {
    const unsubUrl = `${base}/api/digest/unsubscribe?token=${sub.unsub_token}`;
    const html = renderEditionEmail(content, { lang, date, unsubUrl, viewUrl });

    if (!env.EMAIL) {
      console.log(`[digest] EMAIL binding missing — would send "${subject}" to ${sub.email}`);
      continue;
    }
    try {
      await env.EMAIL.send({
        to: sub.email,
        from: { email: from, name: fromName },
        subject,
        html,
      });
      sent++;
    } catch (err) {
      console.error(`[digest] send failed to ${sub.email}:`, err);
    }
  }

  return { recipients: subs.length, sent };
}
