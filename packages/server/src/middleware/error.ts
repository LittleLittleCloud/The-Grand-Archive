import type { Context } from "hono";

export function errorHandler(err: Error, c: Context) {
  console.error(`[ERROR] ${err.message}`, err.stack);
  return c.json(
    {
      error: "Internal Server Error",
      code: "INTERNAL_ERROR",
    },
    500
  );
}
