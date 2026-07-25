import type { D1Database, DurableObjectNamespace } from "@cloudflare/workers-types";
import type { RsshubContainer } from "./rsshub-container";

export interface Bindings {
  DB: D1Database;
  /** RSSHub container binding (see rsshub-container.ts). */
  RSSHUB: DurableObjectNamespace<RsshubContainer>;
  RSSHUB_BASE_URL?: string;
  /** Optional shared secret to guard the manual-trigger fetch handler. */
  INGEST_TRIGGER_TOKEN?: string;
}
