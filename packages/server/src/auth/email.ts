import type { Bindings } from "../types";

interface AuthEmail {
  to: string;
  subject: string;
  html: string;
}

/**
 * Send a transactional auth email via the Cloudflare Email Sending binding
 * (`send_email`, Workers-only). If the binding is missing (local dev, or the
 * domain isn't onboarded yet), it logs the message so the flow still works.
 */
export async function sendAuthEmail(env: Partial<Bindings>, msg: AuthEmail): Promise<void> {
  const from = env.EMAIL_FROM ?? "noreply@dak-news.com";

  if (!env.EMAIL) {
    console.log(`[auth:email] EMAIL binding not configured — would send to ${msg.to}: ${msg.subject}`);
    console.log(`[auth:email] ⚠️  body: ${msg.html}`);
    return;
  }

  try {
    await env.EMAIL.send({
      to: msg.to,
      from: { email: from, name: "大案牍库 The Grand Archive" },
      subject: msg.subject,
      html: msg.html,
      text: stripHtml(msg.html),
    });
  } catch (err) {
    console.error(`[auth:email] send failed to ${msg.to}:`, err);
    console.log(`[auth:email] ⚠️  body (send failed): ${msg.html}`);
  }
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}
