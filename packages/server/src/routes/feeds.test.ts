import { describe, expect, test, beforeAll } from "bun:test";

// Set env BEFORE any module reads it
process.env.DB_PATH = ":memory:";

// Dynamic import so DB_PATH is read as ":memory:"
const { getDb } = await import("../db/client");

// Import app — main() calls initDb() + buildSearchIndex() internally
const { app } = await import("../index");

function req(path: string) {
  return app.request(`http://localhost${path}`);
}

/** Return an ISO date string for today +/- `offset` days. */
function daysAgo(offset: number): string {
  const d = new Date();
  d.setDate(d.getDate() - offset);
  return d.toISOString().slice(0, 10);
}

// Dates relative to today so the anonymous tier's 28-day maxAge window never expires
const TODAY      = daysAgo(0);   // today
const MINUS_5    = daysAgo(5);   // 5 days ago
const MINUS_15   = daysAgo(15);  // 15 days ago
const MINUS_20   = daysAgo(20);  // 20 days ago

const SEED = [
  { id: "a1", title: "Today Entry A",   source: "Bloomberg",  category: "finance", published: `${TODAY}T08:00:00Z` },
  { id: "a2", title: "Today Entry B",   source: "CNBC",       category: "finance", published: `${TODAY}T20:00:00Z` },
  { id: "b1", title: "5 Days Ago",      source: "Bloomberg",  category: "finance", published: `${MINUS_5}T12:00:00Z` },
  { id: "c1", title: "15 Days Ago",     source: "AP News",    category: "news",    published: `${MINUS_15}T10:00:00Z` },
  { id: "d1", title: "20 Days Ago",     source: "BBC Chinese", category: "news",   published: `${MINUS_20}T10:00:00Z` },
];

beforeAll(() => {
  const db = getDb();
  const stmt = db.prepare(
    `INSERT INTO entries (id, title, content, url, source, category, tags, published)
     VALUES (?, ?, NULL, NULL, ?, ?, '[]', ?)`
  );
  for (const e of SEED) {
    stmt.run(e.id, e.title, e.source, e.category, e.published);
  }
});

describe("GET /api/feeds", () => {
  test("returns all entries when no date filter", async () => {
    const res = await req("/api/feeds");
    expect(res.status).toBe(200);
    const body = await res.json() as { entries: unknown[]; total: number };
    expect(body.total).toBe(5);
    expect(body.entries).toHaveLength(5);
  });

  test("--from filters entries >= date", async () => {
    const res = await req(`/api/feeds?from=${TODAY}`);
    expect(res.status).toBe(200);
    const body = await res.json() as { entries: { id: string }[]; total: number };
    expect(body.total).toBe(2);
    const ids = body.entries.map((e) => e.id).sort();
    expect(ids).toEqual(["a1", "a2"]);
  });

  test("--to filters entries <= date", async () => {
    const res = await req(`/api/feeds?to=${MINUS_15}`);
    expect(res.status).toBe(200);
    const body = await res.json() as { entries: { id: string }[]; total: number };
    expect(body.total).toBe(2);
    const ids = body.entries.map((e) => e.id).sort();
    expect(ids).toEqual(["c1", "d1"]);
  });

  test("--from and --to together returns range", async () => {
    const res = await req(`/api/feeds?from=${daysAgo(6)}&to=${daysAgo(1)}`);
    expect(res.status).toBe(200);
    const body = await res.json() as { entries: { id: string }[]; total: number };
    expect(body.total).toBe(1);
    expect(body.entries[0]!.id).toBe("b1");
  });

  test("--from and --to same day returns that day only", async () => {
    const res = await req(`/api/feeds?from=${TODAY}&to=${TODAY}`);
    expect(res.status).toBe(200);
    const body = await res.json() as { entries: { id: string }[]; total: number };
    expect(body.total).toBe(2);
    const ids = body.entries.map((e) => e.id).sort();
    expect(ids).toEqual(["a1", "a2"]);
  });

  test("date range with no matches returns empty", async () => {
    const res = await req(`/api/feeds?from=${daysAgo(27)}&to=${daysAgo(25)}`);
    expect(res.status).toBe(200);
    const body = await res.json() as { entries: unknown[]; total: number };
    expect(body.total).toBe(0);
    expect(body.entries).toHaveLength(0);
  });

  test("category + date filter combined", async () => {
    const res = await req(`/api/feeds?category=news&from=${MINUS_20}&to=${MINUS_15}`);
    expect(res.status).toBe(200);
    const body = await res.json() as { entries: { id: string }[]; total: number };
    expect(body.total).toBe(2);
    const ids = body.entries.map((e) => e.id).sort();
    expect(ids).toEqual(["c1", "d1"]);
  });
});
