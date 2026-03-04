import { test, expect } from "bun:test";
import { Elysia } from "elysia";
import { requestLoggerPlugin } from "../../src/middleware/request-logger";

const errorApp = new Elysia().use(requestLoggerPlugin).get("/error", () => {
  throw new Error("test");
});

test("GET /error returns 500 with Internal Server Error body", async () => {
  const res = await errorApp.handle(new Request("http://localhost/error"));
  expect(res.status).toBe(500);
  const body = (await res.json()) as Record<string, string>;
  expect(body).toEqual({
    error: "Internal Server Error",
    message: "An unexpected error occurred",
  });
});
