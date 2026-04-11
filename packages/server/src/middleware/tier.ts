import type { Context, Next } from "hono";
import { apiKeyMiddleware } from "./api-key";
import { auth } from "../auth/better-auth";
import { getDb } from "../db/client";

export type Tier = "anonymous" | "free" | "premium";

interface TierConfig {
  rateLimit: number; // reqs per minute
  maxAge: string | null; // ISO date cutoff, null = no limit
}

const TIER_CONFIGS: Record<Tier, TierConfig> = {
  anonymous: { rateLimit: 10, maxAge: dateOffset(-28) },
  free: { rateLimit: 60, maxAge: dateOffset(-90) },
  premium: { rateLimit: 120, maxAge: null },
};

/** Sliding window counters: key -> { count, windowStart } */
const counters = new Map<string, { count: number; windowStart: number }>();

/**
 * Combined middleware: identify user → resolve tier → enforce rate limit → set maxAge.
 */
export function tierMiddleware() {
  const apiKey = apiKeyMiddleware();

  return async (c: Context, next: Next) => {
    // Step 1: try Better Auth session
    try {
      const session = await auth.api.getSession({ headers: c.req.raw.headers });
      if (session) {
        c.set("userId", session.user.id);
      }
    } catch {
      // Invalid session — ignore
    }

    // Step 2: try API key (if not already identified via session)
    await apiKey(c, async () => {});

    // Step 2: resolve tier
    const userId = c.get("userId") as string | undefined;
    let tier: Tier = "anonymous";
    let reqBalance = 0;

    if (userId) {
      const db = getDb();
      const user = db
        .query("SELECT plan, reqBalance FROM users WHERE id = ?")
        .get(userId) as { plan: string; reqBalance: number } | null;

      if (user) {
        tier = user.plan === "premium" ? "premium" : "free";
        reqBalance = user.reqBalance;
      }
    }

    const config = TIER_CONFIGS[tier];
    c.set("tier", tier);
    c.set("maxAge", config.maxAge);

    // Step 3: rate limiting
    const key = userId ?? (c.req.header("x-forwarded-for") ?? "unknown");
    const now = Date.now();
    const windowMs = 60_000; // 1 minute

    let counter = counters.get(key);
    if (!counter || now - counter.windowStart > windowMs) {
      counter = { count: 0, windowStart: now };
      counters.set(key, counter);
    }

    const effectiveLimit = config.rateLimit + (reqBalance > 0 ? reqBalance : 0);

    // Set rate limit headers
    const remaining = Math.max(0, effectiveLimit - counter.count);
    const reset = Math.ceil((counter.windowStart + windowMs) / 1000);
    c.header("X-RateLimit-Limit", String(effectiveLimit));
    c.header("X-RateLimit-Remaining", String(remaining));
    c.header("X-RateLimit-Reset", String(reset));

    if (counter.count >= effectiveLimit) {
      return c.json(
        {
          error: "Rate limit exceeded",
          code: "RATE_LIMITED",
          message: "Sign in or upgrade your plan for higher limits.",
          upgrade: "/pricing",
          limit: effectiveLimit,
          reset,
        },
        429
      );
    }

    counter.count++;

    // Deduct from reqBalance if over plan limit and user has balance
    if (userId && counter.count > config.rateLimit && reqBalance > 0) {
      const db = getDb();
      db.query(
        "UPDATE users SET reqBalance = reqBalance - 1 WHERE id = ? AND reqBalance > 0"
      ).run(userId);
    }

    await next();
  };
}

/** Returns ISO date string for N days from now. */
function dateOffset(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}
