import type { Tier } from "./middleware/tier";

/** Augment Hono context variables for type-safe c.get/c.set */
declare module "hono" {
  interface ContextVariableMap {
    userId: string | undefined;
    sessionId: string | undefined;
    apiKeyId: string | undefined;
    tier: Tier;
    maxAge: string | null;
  }
}
