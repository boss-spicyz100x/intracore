import { test, expect } from "bun:test";
import { createTestDb, createTestAppWithAuth } from "../helpers";

async function getAccessToken(app: Awaited<ReturnType<typeof createTestAppWithAuth>>) {
  const res = await app.handle(
    new Request("http://localhost/v1/identity/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer valid-token",
      },
      body: JSON.stringify({}),
    }),
  );
  expect(res.status).toBe(200);
  const body = (await res.json()) as { accessToken: string };
  return body.accessToken;
}

test("POST /v1/identity/token with valid GitHub token + whitelisted email → 200, returns accessToken and expiresAt", async () => {
  const db = createTestDb();
  const app = await createTestAppWithAuth(db);
  const res = await app.handle(
    new Request("http://localhost/v1/identity/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer valid-token",
      },
      body: JSON.stringify({}),
    }),
  );
  expect(res.status).toBe(200);
  const body = (await res.json()) as { accessToken: string; expiresAt: string };
  expect(body.accessToken).toBeDefined();
  expect(typeof body.accessToken).toBe("string");
  expect(body.expiresAt).toBeDefined();
  expect(typeof body.expiresAt).toBe("string");
});

test("POST /v1/identity/token with valid GitHub token but non-whitelisted email → 403", async () => {
  const db = createTestDb();
  const app = await createTestAppWithAuth(db, { email: "nonseeded@example.com" });
  const res = await app.handle(
    new Request("http://localhost/v1/identity/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer valid-token",
      },
      body: JSON.stringify({}),
    }),
  );
  expect(res.status).toBe(403);
  const body = (await res.json()) as { error: string; message: string };
  expect(body.error).toBe("Forbidden");
  expect(body.message).toContain("whitelist");
});

test("POST /v1/identity/token with invalid GitHub token → 401", async () => {
  const db = createTestDb();
  const app = await createTestAppWithAuth(db);
  const prevFetch = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : (input as Request).url;
    if (url.includes("api.github.com")) {
      return new Response(JSON.stringify({ message: "Bad credentials" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
    return prevFetch(input as RequestInfo, init);
  }) as typeof fetch;
  try {
    const res = await app.handle(
      new Request("http://localhost/v1/identity/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer invalid-token",
        },
        body: JSON.stringify({}),
      }),
    );
    expect(res.status).toBe(401);
    const body = (await res.json()) as { error: string; message: string };
    expect(body.error).toBe("Unauthorized");
    expect(body.message).toContain("Invalid GitHub token");
  } finally {
    (app as any).restoreFetch?.();
  }
});

test("GET /v1/tickets without Authorization header → 401", async () => {
  const db = createTestDb();
  const app = await createTestAppWithAuth(db);
  const res = await app.handle(new Request("http://localhost/v1/tickets"));
  expect(res.status).toBe(401);
  const body = (await res.json()) as { error: string; message: string };
  expect(body.error).toBe("Unauthorized");
});

test("GET /v1/tickets with valid Bearer token → 200 (list tickets)", async () => {
  const db = createTestDb();
  const app = await createTestAppWithAuth(db);
  const accessToken = await getAccessToken(app);
  const res = await app.handle(
    new Request("http://localhost/v1/tickets", {
      headers: { Authorization: `Bearer ${accessToken}` },
    }),
  );
  expect(res.status).toBe(200);
  const body = await res.json();
  expect(Array.isArray(body)).toBe(true);
});

test("GET /v1/identity/whitelists with valid token → 200, returns array", async () => {
  const db = createTestDb();
  const app = await createTestAppWithAuth(db);
  const accessToken = await getAccessToken(app);
  const res = await app.handle(
    new Request("http://localhost/v1/identity/whitelists", {
      headers: { Authorization: `Bearer ${accessToken}` },
    }),
  );
  expect(res.status).toBe(200);
  const body = (await res.json()) as Array<{ id: string; email: string }>;
  expect(Array.isArray(body)).toBe(true);
  expect(body.length).toBeGreaterThanOrEqual(2);
  const emails = body.map((w) => w.email);
  expect(emails).toContain("earth@100x.fi");
  expect(emails).toContain("boss.spicyz@100x.fi");
});

test("POST /v1/identity/whitelists with valid token + { email } → 200", async () => {
  const db = createTestDb();
  const app = await createTestAppWithAuth(db);
  const accessToken = await getAccessToken(app);
  const res = await app.handle(
    new Request("http://localhost/v1/identity/whitelists", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ email: "newuser@100x.fi" }),
    }),
  );
  expect(res.status).toBe(200);
  const body = (await res.json()) as { id: string; email: string };
  expect(body.email).toBe("newuser@100x.fi");
  expect(body.id).toBeDefined();
});

test("DELETE /v1/identity/sessions/:id with valid token → 200", async () => {
  const db = createTestDb();
  const app = await createTestAppWithAuth(db);
  const accessToken = await getAccessToken(app);
  const sessionsRes = await app.handle(
    new Request("http://localhost/v1/identity/sessions", {
      headers: { Authorization: `Bearer ${accessToken}` },
    }),
  );
  expect(sessionsRes.status).toBe(200);
  const sessions = (await sessionsRes.json()) as Array<{ id: string }>;
  expect(sessions.length).toBeGreaterThanOrEqual(1);
  const sessionId = sessions[0]!.id;
  const res = await app.handle(
    new Request(`http://localhost/v1/identity/sessions/${sessionId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` },
    }),
  );
  expect(res.status).toBe(200);
  const body = (await res.json()) as { id: string };
  expect(body.id).toBe(sessionId);
});
