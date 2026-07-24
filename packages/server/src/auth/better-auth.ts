import { betterAuth } from "better-auth";
import type { BetterAuthOptions } from "better-auth";
import { username, admin, magicLink } from "better-auth/plugins";
import { Kysely } from "kysely";
import { D1Dialect } from "kysely-d1";
import type { Bindings } from "../types";
import { sendAuthEmail } from "./email";

/**
 * Better Auth options excluding the database. Shared between the runtime factory
 * (createAuth) and the schema-generation entry so the generated migration always
 * matches the live config (plugins, additionalFields, model names).
 */
export function authOptions(env: Partial<Bindings>): BetterAuthOptions {
  // Canonical production URL — used as the safe fallback. Local dev leaves
  // BETTER_AUTH_URL blank (.dev.vars); production sets it to the real domain.
  const configured = env.BETTER_AUTH_URL?.trim();
  const canonical = configured && configured.length > 0 ? configured : undefined;

  // Auth URLs (magic link / reset / verify / OAuth callback) are composed from
  // the request's OWN host — but only when that host is in this allowlist;
  // otherwise Better Auth falls back to `canonical`. This makes preview and
  // prod links self-consistent (the session cookie lands on the host the user
  // is actually on) while blocking Host-header poisoning of emailed links.
  const allowedHosts = ["*.workers.dev", "localhost:*", "127.0.0.1:*"];
  if (canonical) {
    try {
      allowedHosts.push(new URL(canonical).host);
    } catch {
      // ignore malformed canonical URL
    }
  }

  return {
    secret: env.BETTER_AUTH_SECRET,
    baseURL: { allowedHosts, protocol: "auto", fallback: canonical },
    basePath: "/api/auth" as const,
    // The dynamic baseURL object means Better Auth can't infer https at init, so
    // it stops marking cookies Secure. Deployed envs always set BETTER_AUTH_URL
    // (https), so key Secure cookies off that; local http dev leaves it unset.
    advanced: { useSecureCookies: Boolean(canonical) },
    // Better Auth auto-trusts the resolved per-request baseURL origin; we also
    // trust localhost dev, any *.workers.dev preview, the canonical domain,
    // TRUSTED_ORIGINS extras, and the request's own (same) origin.
    trustedOrigins: (request?: Request) => {
      const origins = new Set<string>([
        "http://localhost:5173",
        "http://localhost:8787",
        "https://*.workers.dev",
      ]);
      if (canonical) origins.add(canonical);
      // Extra origins from config (comma-separated).
      for (const o of (env.TRUSTED_ORIGINS ?? "").split(",").map((s) => s.trim()).filter(Boolean)) {
        origins.add(o);
      }
      const origin = request?.headers.get("origin");
      const host = request?.headers.get("host");
      if (origin) {
        try {
          if (new URL(origin).host === host) origins.add(origin);
        } catch {
          // ignore malformed origin
        }
      }
      return [...origins];
    },
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
      sendResetPassword: async ({ user, url }) => {
        await sendAuthEmail(env, {
          to: user.email,
          subject: "Reset your password — 大案牍库",
          html: `<p>Hi ${user.name},</p><p>Click the link below to reset your password:</p><p><a href="${url}">${url}</a></p>`,
        });
      },
      // Completing an emailed reset proves the user controls the address, so
      // mark it verified. Without this, requireEmailVerification blocks the very
      // login the user attempts right after resetting (and sendOnSignIn just
      // loops another verification email).
      onPasswordReset: async ({ user }) => {
        if (env.DB) {
          await env.DB.prepare("UPDATE users SET emailVerified = 1 WHERE id = ?")
            .bind(user.id)
            .run();
        }
      },
    },
    emailVerification: {
      sendOnSignUp: true,
      sendOnSignIn: true,
      sendVerificationEmail: async ({ user, url }) => {
        await sendAuthEmail(env, {
          to: user.email,
          subject: "Verify your email — 大案牍库",
          html: `<p>Click the link below to verify your email:</p><p><a href="${url}">${url}</a></p>`,
        });
      },
    },
    socialProviders: {
      github: {
        clientId: env.GITHUB_CLIENT_ID as string,
        clientSecret: env.GITHUB_CLIENT_SECRET as string,
        mapProfileToUser: (profile) => ({
          username: profile.login,
          displayUsername: profile.login,
        }),
      },
      google: {
        clientId: env.GOOGLE_CLIENT_ID as string,
        clientSecret: env.GOOGLE_CLIENT_SECRET as string,
        mapProfileToUser: (profile) => ({
          username: profile.email?.split("@")[0],
        }),
      },
    },
    plugins: [
      username(),
      admin(),
      // Passwordless sign-in: emails a one-time link that mints a session.
      // Clicking it also proves email ownership, so it doubles as verification.
      magicLink({
        sendMagicLink: async ({ email, url }) => {
          await sendAuthEmail(env, {
            to: email,
            subject: "Your sign-in link — 大案牍库",
            html: `<p>Click the link below to sign in:</p><p><a href="${url}">${url}</a></p><p>This link expires shortly and can be used once. If you didn't request it, you can ignore this email.</p>`,
          });
        },
      }),
    ],
    user: {
      modelName: "users",
      additionalFields: {
        plan: { type: "string", defaultValue: "free", required: false, input: false },
        reqBalance: { type: "number", defaultValue: 0, required: false, input: false },
      },
    },
    session: { modelName: "sessions" },
  };
}

/**
 * Better Auth is created per-request on Workers because secrets/bindings live on
 * `env`, not `process.env`. The instance is cheap; the Kysely D1 dialect is the
 * durable store for users/sessions/account/verification.
 */
export function createAuth(env: Bindings) {
  const db = new Kysely<Record<string, never>>({
    dialect: new D1Dialect({ database: env.DB as unknown as D1DialectDatabase }),
  });

  return betterAuth({
    database: { db, type: "sqlite" },
    ...authOptions(env),
  });
}

export type Auth = ReturnType<typeof createAuth>;

// kysely-d1 expects its own D1Database type; alias to avoid a hard import cycle.
type D1DialectDatabase = ConstructorParameters<typeof D1Dialect>[0]["database"];
