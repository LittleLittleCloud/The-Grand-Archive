import { betterAuth } from "better-auth";
import { username, admin } from "better-auth/plugins";
import { Database } from "bun:sqlite";
import { Resend } from "resend";

const DB_PATH = process.env.DB_PATH ?? "./data/dak.db";
const resend = new Resend(process.env.RESEND_API_KEY);
const EMAIL_FROM = process.env.EMAIL_FROM ?? "onboarding@resend.dev";

export const auth = betterAuth({
  database: new Database(DB_PATH, { create: true }),
  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
  basePath: "/api/auth",
  trustedOrigins: ["http://localhost:5173"],
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    sendResetPassword: async ({ user, url }) => {
      await resend.emails.send({
        from: EMAIL_FROM,
        to: user.email,
        subject: "Reset your password — 大案牍库",
        html: `<p>Click the link below to reset your password:</p><p><a href="${url}">${url}</a></p>`,
      });
    },
  },
  emailVerification: {
    sendVerificationEmail: async ({ user, url }) => {
      await resend.emails.send({
        from: EMAIL_FROM,
        to: user.email,
        subject: "Verify your email — 大案牍库",
        html: `<p>Click the link below to verify your email:</p><p><a href="${url}">${url}</a></p>`,
      });
    },
  },
  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID as string,
      clientSecret: process.env.GITHUB_CLIENT_SECRET as string,
    },
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    },
  },
  plugins: [username(), admin()],
  user: {
    modelName: "users",
    additionalFields: {
      plan: {
        type: "string",
        defaultValue: "free",
        required: false,
        input: false,
      },
      reqBalance: {
        type: "number",
        defaultValue: 0,
        required: false,
        input: false,
      },
    },
  },
  session: {
    modelName: "sessions",
  },
});
