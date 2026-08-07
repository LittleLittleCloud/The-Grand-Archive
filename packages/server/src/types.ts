import type { D1Database, Fetcher } from "@cloudflare/workers-types";

/** Cloudflare Email Sending binding (send_email). */
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

/** Cloudflare bindings + vars available on the Worker / Pages Functions env. */
export interface Bindings {
  // Storage
  DB: D1Database;
  ASSETS?: Fetcher;

  // Email (send_email binding — Workers only, not Pages Functions)
  EMAIL?: EmailSendBinding;

  // Rate limiting (one binding per tier — see wrangler.jsonc)
  RL_ANON?: RateLimitBinding;
  RL_FREE?: RateLimitBinding;
  RL_PREMIUM?: RateLimitBinding;

  // Vars
  SEARCH_ENGINE?: string;
  BETTER_AUTH_URL?: string;
  // Comma-separated list of extra origins Better Auth should trust as callback
  // URLs (e.g. the worker's own *.workers.dev origin during/after DNS cutover).
  TRUSTED_ORIGINS?: string;
  INGEST_ALLOWED_USERS?: string;
  EMAIL_FROM?: string;

  // Digest worker trigger (admin "generate now" button). The server calls the
  // digest worker's token-guarded /run endpoint.
  DIGEST_WORKER_URL?: string;
  DIGEST_TRIGGER_TOKEN?: string;

  // Secrets
  BETTER_AUTH_SECRET?: string;
  GITHUB_CLIENT_ID?: string;
  GITHUB_CLIENT_SECRET?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
}

/** Cloudflare Rate Limiting binding shape. */
export interface RateLimitBinding {
  limit(options: { key: string }): Promise<{ success: boolean }>;
}

/** Hono environment: typed bindings. Context variables are declared in env.d.ts. */
export type HonoEnv = { Bindings: Bindings };
