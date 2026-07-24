import type { D1Database } from "@cloudflare/workers-types";

export interface Bindings {
  DB: D1Database;
  RSSHUB_BASE_URL?: string;
  /** Optional shared secret to guard the manual-trigger fetch handler. */
  INGEST_TRIGGER_TOKEN?: string;
}
