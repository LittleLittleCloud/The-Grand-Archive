import { describe, expect, test } from "bun:test";
import { Hono } from "hono";
import { mcpRoutes } from "./mcp";

interface StubRun {
  sql: string;
  args: unknown[];
}

/** Minimal D1 stub: records statements and replays canned rows. */
function stubDb(rows: { first?: unknown; all?: unknown[] } = {}) {
  const runs: StubRun[] = [];
  const db = {
    runs,
    prepare(sql: string) {
      const stmt = {
        args: [] as unknown[],
        bind(...args: unknown[]) {
          stmt.args = args;
          return stmt;
        },
        first: async () => {
          runs.push({ sql, args: stmt.args });
          return rows.first ?? null;
        },
        all: async () => {
          runs.push({ sql, args: stmt.args });
          return { results: rows.all ?? [] };
        },
        run: async () => {
          runs.push({ sql, args: stmt.args });
          return { meta: { changes: 1 } };
        },
      };
      return stmt;
    },
  };
  return db;
}

function appWith(db: unknown, userId?: string) {
  const app = new Hono();
  app.use("*", async (c, next) => {
    if (userId) c.set("userId", userId);
    await next();
  });
  app.route("/", mcpRoutes);
  return (payload: unknown) =>
    app.request(
      "http://localhost/mcp",
      { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) },
      { DB: db }
    );
}

describe("MCP tools", () => {
  test("every advertised tool name starts with dak_", async () => {
    const res = await appWith(stubDb())({ jsonrpc: "2.0", id: 1, method: "tools/list" });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { result: { tools: { name: string }[] } };
    const names = body.result.tools.map((t) => t.name);
    expect(names.every((n) => n.startsWith("dak_"))).toBe(true);
    expect(names).toContain("dak_search");
    expect(names).toContain("dak_api_key_create");
    expect(names).toContain("dak_digest_publish");
  });

  test("legacy api_* tool names still resolve", async () => {
    const res = await appWith(stubDb({ all: [{ date: "2026-01-01", lang: "en", title: "t", summary: null }] }))({
      jsonrpc: "2.0",
      id: 2,
      method: "tools/call",
      params: { name: "api_digest_editions", arguments: { lang: "en" } },
    });
    const body = (await res.json()) as { result?: { structuredContent: { editions: unknown[] } } };
    expect(body.result?.structuredContent.editions).toHaveLength(1);
  });

  test("dak_api_key_create requires an authenticated user", async () => {
    const res = await appWith(stubDb())({
      jsonrpc: "2.0",
      id: 3,
      method: "tools/call",
      params: { name: "dak_api_key_create", arguments: { name: "my key" } },
    });
    const body = (await res.json()) as { error?: { message: string } };
    expect(body.error?.message).toContain("Sign in");
  });

  test("dak_api_key_create returns a one-time key for a signed-in user", async () => {
    const db = stubDb();
    const res = await appWith(db, "user-1")({
      jsonrpc: "2.0",
      id: 4,
      method: "tools/call",
      params: { name: "dak_api_key_create", arguments: { name: "my key" } },
    });
    const body = (await res.json()) as { result?: { structuredContent: { key: string; prefix: string } } };
    expect(body.result?.structuredContent.key).toStartWith("dak_");
    expect(body.result?.structuredContent.prefix).toBe("dak_" + body.result!.structuredContent.key.slice(4, 8));
    expect(db.runs.some((r) => r.sql.startsWith("INSERT INTO api_keys"))).toBe(true);
  });

  test("dak_digest_publish rejects non-admin callers", async () => {
    const res = await appWith(stubDb({ first: { role: "user" } }), "user-1")({
      jsonrpc: "2.0",
      id: 5,
      method: "tools/call",
      params: { name: "dak_digest_publish", arguments: {} },
    });
    const body = (await res.json()) as { error?: { message: string } };
    expect(body.error?.message).toContain("admin");
  });

  test("unknown tools report the requested name", async () => {
    const res = await appWith(stubDb())({
      jsonrpc: "2.0",
      id: 6,
      method: "tools/call",
      params: { name: "api_unknown" },
    });
    const body = (await res.json()) as { error?: { message: string } };
    expect(body.error?.message).toContain("api_unknown");
  });
});
