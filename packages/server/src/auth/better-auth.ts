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
  const BASE_URL = env.BETTER_AUTH_URL ?? "http://localhost:8787";

  return {
    secret: env.BETTER_AUTH_SECRET,
    baseURL: BASE_URL,
    basePath: "/api/auth" as const,
    trustedOrigins: [BASE_URL, "http://localhost:5173"],
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
