// Schema-generation script ONLY (not shipped to the Worker). Run with Bun:
//   bun run scripts/gen-auth.ts > migrations/0002_auth.sql
// Emits the SQLite DDL for users/sessions/account/verification matching the
// runtime config in src/auth/better-auth.ts.
import { betterAuth } from "better-auth";
import { Database } from "bun:sqlite";
import { getMigrations } from "better-auth/db/migration";
import { authOptions } from "../src/auth/better-auth";

const auth = betterAuth({
  database: new Database(":memory:"),
  ...authOptions({}),
});

const { compileMigrations } = await getMigrations(auth.options);
const sql = await compileMigrations();
process.stdout.write(sql);
