import type { Context, Next } from "hono";
import { apiKeyMiddleware } from "./api-key";
import { createAuth } from "../auth/better-auth";
import type { HonoEnv } from "../types";

export type Tier = "anonymous" | "free" | "premium";

interface TierConfig {
  rateLimit: number; // reqs per minute (informational header; enforced by the RL binding)
  maxAgeDays: number | null; // history window in days, null = no limit
}

// NOTE: the ISO cutoff is computed per-request (not here), because on deployed
// Workers the current time is frozen at the Unix epoch during module init.
const TIER_CONFIGS: Record<Tier, TierConfig> = {
  anonymous: { rateLimit: 10, maxAgeDays: 28 },
  free: { rateLimit: 30, maxAgeDays: 28 },
  premium: { rateLimit: 120, maxAgeDays: 90 },
};

/**
 * Combined middleware: identify user → resolve tier → enforce rate limit → set maxAge.
 * Rate limiting uses Cloudflare Rate Limiting bindings (one per tier). If the
 * bindings are absent (e.g. local dev), rate limiting is skipped.
 */
export function tierMiddleware() {
  const apiKey = apiKeyMiddleware();

  return async (c: Context<HonoEnv>, next: Next) => {
    // Fast path: a request with no session cookie and no API key is
    // unauthenticated for certain → anonymous tier. Rate-limit it by IP up
    // front and skip the Better Auth session check and the D1 tier lookup
    // entirely, so abusive unauthenticated traffic (scrapers) stays cheap.
    const cookie = c.req.header("cookie") ?? "";
    const hasSessionCookie = cookie.includes("better-auth.session_token");
    const hasApiKey =
      !!c.req.header("authorization") || !!c.req.header("x-api-key");

    if (!hasSessionCookie && !hasApiKey) {
      const config = TIER_CONFIGS.anonymous;
      c.set("tier", "anonymous");
      c.set("maxAge", config.maxAgeDays == null ? null : dateOffset(-config.maxAgeDays));
      const key =
        c.req.header("cf-connecting-ip") ??
        c.req.header("x-forwarded-for") ??
        "unknown";
      c.header("X-RateLimit-Limit", String(config.rateLimit));
      if (c.env.RL_ANON) {
        const { success } = await c.env.RL_ANON.limit({ key });
        if (!success) return rejectRateLimited(c, "anonymous", key, config.rateLimit);
      }
      await next();
      return;
    }

    // Step 1: Better Auth session
    try {
      const auth = createAuth(c.env);
      const session = await auth.api.getSession({ headers: c.req.raw.headers });
      if (session) {
        c.set("userId", session.user.id);
      }
    } catch {
      // Invalid session — ignore
    }

    // Step 2: API key (if not already identified via session)
    await apiKey(c, async () => {});

    // Step 3: resolve tier
    const userId = c.get("userId") as string | undefined;
    let tier: Tier = "anonymous";
    let reqBalance = 0;

    if (userId) {
      const user = await c.env.DB.prepare(
        "SELECT plan, reqBalance FROM users WHERE id = ?"
      )
        .bind(userId)
        .first<{ plan: string; reqBalance: number }>();

      if (user) {
        tier = user.plan === "premium" ? "premium" : "free";
        reqBalance = user.reqBalance ?? 0;
      }
    }

    const config = TIER_CONFIGS[tier];
    const maxAge = config.maxAgeDays == null ? null : dateOffset(-config.maxAgeDays);
    c.set("tier", tier);
    c.set("maxAge", maxAge);

    // Step 4: rate limiting via the per-tier binding
    const key =
      userId ??
      c.req.header("cf-connecting-ip") ??
      c.req.header("x-forwarded-for") ??
      "unknown";

    const limiter =
      tier === "premium"
        ? c.env.RL_PREMIUM
        : tier === "free"
          ? c.env.RL_FREE
          : c.env.RL_ANON;

    const effectiveLimit = config.rateLimit + (reqBalance > 0 ? reqBalance : 0);
    c.header("X-RateLimit-Limit", String(effectiveLimit));

    if (limiter) {
      const { success } = await limiter.limit({ key });
      if (!success) {
        // Allow over-limit requests to spend a top-up balance, if any.
        if (userId && reqBalance > 0) {
          await c.env.DB.prepare(
            "UPDATE users SET reqBalance = reqBalance - 1 WHERE id = ? AND reqBalance > 0"
          )
            .bind(userId)
            .run();
        } else {
          return rejectRateLimited(c, tier, key, effectiveLimit);
        }
      }
    }

    await next();
  };
}

/** Log a rate_limited event and return the 429 response. */
function rejectRateLimited(c: Context<HonoEnv>, tier: Tier, key: string, limit: number) {
  const cf = (c.req.raw as unknown as { cf?: Record<string, unknown> }).cf;
  console.warn(
    JSON.stringify({
      evt: "rate_limited",
      key,
      tier,
      userId: (c.get("userId") as string | undefined) ?? null,
      ip: c.req.header("cf-connecting-ip") ?? "?",
      country: cf?.country ?? null,
      asn: cf?.asn ?? null,
      method: c.req.method,
      path: c.req.path,
      ua: c.req.header("user-agent") ?? null,
      referer: c.req.header("referer") ?? null,
      limit,
    })
  );
  return c.json(
    {
      error: "Rate limit exceeded",
      code: "RATE_LIMITED",
      message: "Sign in or upgrade your plan for higher limits.",
      upgrade: "/pricing",
      limit,
    },
    429
  );
}

/** Returns ISO date string for N days from now. */
function dateOffset(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}
