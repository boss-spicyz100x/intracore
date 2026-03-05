import { test, expect } from "bun:test";
import { eq } from "drizzle-orm";
import { createTestDb } from "../../tests/helpers";
import { createSession, validateSession, listSessions } from "./sessions";
import { sessions } from "../db/schema.postgres";

test("createSession returns accessToken and expiresAt", async () => {
  const db = createTestDb();
  const result = await createSession(db, "test@example.com");
  expect(result.accessToken).toBeDefined();
  expect(result.accessToken.length).toBeGreaterThan(0);
  expect(result.expiresAt).toBeDefined();
  expect(new Date(result.expiresAt).getTime()).toBeGreaterThan(Date.now());
});

test("validateSession with valid token returns session", async () => {
  const db = createTestDb();
  const { accessToken } = await createSession(db, "valid@example.com");
  const session = await validateSession(db, accessToken);
  expect(session).not.toBeNull();
  expect(session!.id).toBeDefined();
  expect(session!.email).toBe("valid@example.com");
});

test("validateSession with invalid token returns null", async () => {
  const db = createTestDb();
  const session = await validateSession(db, "invalid-token-that-does-not-exist");
  expect(session).toBeNull();
});

test("validateSession with expired session returns null", async () => {
  const db = createTestDb();
  const { accessToken } = await createSession(db, "expired@example.com");
  const all = await listSessions(db);
  const created = all.find((s) => s.email === "expired@example.com");
  expect(created).toBeDefined();
  await db
    .update(sessions)
    .set({ expiresAt: "1970-01-01T00:00:00.000Z" })
    .where(eq(sessions.id, created!.id));
  const session = await validateSession(db, accessToken);
  expect(session).toBeNull();
});
