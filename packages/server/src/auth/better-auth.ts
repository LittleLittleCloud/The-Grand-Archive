import { betterAuth } from "better-auth";
import type { BetterAuthOptions } from "better-auth";
import { username, admin } from "better-auth/plugins";
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
  // When BETTER_AUTH_URL is empty/unset, Better Auth infers baseURL from the
  // request — which is what we want for dynamic preview (workers.dev) URLs.
  // Production sets it to the real domain; local dev sets it via .dev.vars.
  const configured = env.BETTER_AUTH_URL?.trim();
  const BASE_URL = configured && configured.length > 0 ? configured : undefined;

  return {
    secret: env.BETTER_AUTH_SECRET,
    baseURL: BASE_URL,
    basePath: "/api/auth" as const,
    // Trust the known hosts plus the deployment's OWN origin (covers workers.dev
    // preview URLs and the custom domain). A same-origin request is never
    // cross-site, so trusting it is safe for CSRF.
    trustedOrigins: (request?: Request) => {
      const origins = new Set<string>([
        "http://localhost:5173",
        "http://localhost:8787",
      ]);
      if (BASE_URL) origins.add(BASE_URL);
      // Extra origins (e.g. the worker's own *.workers.dev URL) so callback URLs
      // minted while the UI was served from that origin still validate.
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
    plugins: [username(), admin()],
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
