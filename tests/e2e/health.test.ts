import { test, expect } from "bun:test";
import { createTestDb, createTestApp } from "../helpers";

test("GET / returns 200 with status ok", async () => {
  const db = await createTestDb();
  const app = createTestApp(db);
  const res = await app.handle(new Request("http://localhost/"));
  expect(res.status).toBe(200);
  const body = (await res.json()) as Record<string, unknown>;
  expect(body).toMatchObject({ status: "ok" });
  expect(body.timestamp).toBeDefined();
});

test("GET /health returns 200 with status ok", async () => {
  const db = await createTestDb();
  const app = createTestApp(db);
  const res = await app.handle(new Request("http://localhost/health"));
  expect(res.status).toBe(200);
  const body = (await res.json()) as Record<string, unknown>;
  expect(body).toMatchObject({ status: "ok" });
  expect(body.timestamp).toBeDefined();
});
