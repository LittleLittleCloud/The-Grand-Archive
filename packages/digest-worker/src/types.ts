import type { D1Database, Workflow } from "@cloudflare/workers-types";

/** Cloudflare Email Sending binding (send_email). Matches the shape used by the
 *  server worker's auth/email helper. */
export interface EmailSendBinding {
  send(message: {
    to: string | string[];
    from: string | { email: string; name?: string };
    subject: string;
    html?: string;
    text?: string;
    replyTo?: string;
  }): Promise<{ messageId?: string }>;
}

export interface Bindings {
  DB: D1Database;

  /** The daily digest Workflow (durable multi-step generation + send). */
  DIGEST_WORKFLOW: Workflow<DigestWorkflowParams>;

  /** Cloudflare Email Sending binding (fan-out to subscribers). */
  EMAIL?: EmailSendBinding;

  // Cloudflare AI Gateway credentials for pi-ai (REST, not the `ai` binding).
  CLOUDFLARE_API_KEY?: string;
  CLOUDFLARE_ACCOUNT_ID?: string;
  CLOUDFLARE_GATEWAY_ID?: string;

  // Vars
  /** pi-ai model id, e.g. "workers-ai/@cf/meta/llama-3.3-70b-instruct-fp8-fast". */
  DIGEST_MODEL?: string;
  /** Public origin used to build unsubscribe / view-in-browser links. */
  PUBLIC_BASE_URL?: string;
  EMAIL_FROM?: string;
  /** Optional shared secret guarding the manual-trigger fetch handler. */
  DIGEST_TRIGGER_TOKEN?: string;
}

export interface DigestWorkflowParams {
  /** YYYY-MM-DD (UTC). Defaults to today. */
  date?: string;
  /** Languages to generate. Defaults to ["en", "zh"]. */
  langs?: ("en" | "zh")[];
}

/** A single story the research agent selected for the day. */
export interface BriefItem {
  entryId: string | null;
  title: string;
  url: string | null;
  source: string | null;
  category: string | null;
  note: string;
}

/** Output of the "gather" step: the day's notable stories with brief notes. */
export interface ResearchBrief {
  date: string;
  items: BriefItem[];
}
