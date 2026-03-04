import { test, expect } from "bun:test";
import { v7 as uuidv7 } from "uuid";
import { createTestDb, createTestApp } from "../helpers";

test("GET /v1/companies returns [] on empty DB", async () => {
  const db = await createTestDb();
  const app = createTestApp(db);
  const res = await app.handle(new Request("http://localhost/v1/companies"));
  expect(res.status).toBe(200);
  const body = await res.json();
  expect(body).toEqual([]);
});

test("POST /v1/companies creates company returns 200", async () => {
  const db = await createTestDb();
  const app = createTestApp(db);
  const res = await app.handle(
    new Request("http://localhost/v1/companies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Acme Corp",
        slug: "acme",
        description: "A test company",
      }),
    }),
  );
  expect(res.status).toBe(200);
  const body = (await res.json()) as Record<string, unknown>;
  expect(body.name).toBe("Acme Corp");
  expect(body.slug).toBe("ACME");
  expect(body.description).toBe("A test company");
  expect(body.id).toBeDefined();
  expect(body.createdAt).toBeDefined();
  expect(body.updatedAt).toBeDefined();
});

test("POST /v1/companies missing required fields returns 422", async () => {
  const db = await createTestDb();
  const app = createTestApp(db);
  const res = await app.handle(
    new Request("http://localhost/v1/companies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "No slug" }),
    }),
  );
  expect(res.status).toBe(422);
});

test("POST /v1/companies invalid slug (hyphen) returns 400", async () => {
  const db = await createTestDb();
  const app = createTestApp(db);
  const res = await app.handle(
    new Request("http://localhost/v1/companies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Ingfah", slug: "ing-fah" }),
    }),
  );
  expect(res.status).toBe(400);
  const body = await res.json();
  expect(body).toMatchObject({
    error: "Bad Request",
    message: "Slug must be uppercase letters and numbers only (e.g. ING)",
  });
});

test("POST /v1/companies lowercase slug normalized to uppercase", async () => {
  const db = await createTestDb();
  const app = createTestApp(db);
  const res = await app.handle(
    new Request("http://localhost/v1/companies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Ingfah", slug: "ing" }),
    }),
  );
  expect(res.status).toBe(200);
  const body = (await res.json()) as Record<string, unknown>;
  expect(body.slug).toBe("ING");
});

test("POST /v1/companies duplicate slug returns 409", async () => {
  const db = await createTestDb();
  const app = createTestApp(db);
  const create1 = await app.handle(
    new Request("http://localhost/v1/companies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "First", slug: "ACME" }),
    }),
  );
  expect(create1.status).toBe(200);

  const create2 = await app.handle(
    new Request("http://localhost/v1/companies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Second", slug: "ACME" }),
    }),
  );
  expect(create2.status).toBe(409);
  const body = await create2.json();
  expect(body).toMatchObject({
    error: "Conflict",
    message: "Company slug already exists",
  });
});

test("GET /v1/companies/:id returns company", async () => {
  const db = await createTestDb();
  const app = createTestApp(db);
  const createRes = await app.handle(
    new Request("http://localhost/v1/companies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Get Co", slug: "getco" }),
    }),
  );
  const company = (await createRes.json()) as { id: string };

  const res = await app.handle(new Request(`http://localhost/v1/companies/${company.id}`));
  expect(res.status).toBe(200);
  const body = (await res.json()) as Record<string, unknown>;
  expect(body.id).toBe(company.id);
  expect(body.name).toBe("Get Co");
  expect(body.slug).toBe("GETCO");
});

test("GET /v1/companies/:id non-existent returns 404", async () => {
  const db = await createTestDb();
  const app = createTestApp(db);
  const res = await app.handle(new Request(`http://localhost/v1/companies/${uuidv7()}`));
  expect(res.status).toBe(404);
  const body = await res.json();
  expect(body).toMatchObject({
    error: "Not Found",
    message: "Company not found",
  });
});

test("GET /v1/companies/:id invalid UUID returns 422", async () => {
  const db = await createTestDb();
  const app = createTestApp(db);
  const res = await app.handle(new Request("http://localhost/v1/companies/not-a-uuid"));
  expect(res.status).toBe(422);
});

test("PUT /v1/companies/:id updates company", async () => {
  const db = await createTestDb();
  const app = createTestApp(db);
  const createRes = await app.handle(
    new Request("http://localhost/v1/companies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Original", slug: "orig" }),
    }),
  );
  const company = (await createRes.json()) as { id: string };

  const res = await app.handle(
    new Request(`http://localhost/v1/companies/${company.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Updated Name",
        slug: "updated",
        description: "New desc",
      }),
    }),
  );
  expect(res.status).toBe(200);
  const body = (await res.json()) as Record<string, unknown>;
  expect(body.name).toBe("Updated Name");
  expect(body.slug).toBe("UPDATED");
  expect(body.description).toBe("New desc");
});

test("PUT /v1/companies/:id partial update", async () => {
  const db = await createTestDb();
  const app = createTestApp(db);
  const createRes = await app.handle(
    new Request("http://localhost/v1/companies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Partial", slug: "partial", description: "Old" }),
    }),
  );
  const company = (await createRes.json()) as { id: string };

  const res = await app.handle(
    new Request(`http://localhost/v1/companies/${company.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ description: "New only" }),
    }),
  );
  expect(res.status).toBe(200);
  const body = (await res.json()) as Record<string, unknown>;
  expect(body.name).toBe("Partial");
  expect(body.slug).toBe("PARTIAL");
  expect(body.description).toBe("New only");
});

test("PUT /v1/companies/:id non-existent returns 404", async () => {
  const db = await createTestDb();
  const app = createTestApp(db);
  const res = await app.handle(
    new Request(`http://localhost/v1/companies/${uuidv7()}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Nope" }),
    }),
  );
  expect(res.status).toBe(404);
});

test("PUT /v1/companies/:id invalid slug returns 400", async () => {
  const db = await createTestDb();
  const app = createTestApp(db);
  const createRes = await app.handle(
    new Request("http://localhost/v1/companies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Test", slug: "TEST" }),
    }),
  );
  const company = (await createRes.json()) as { id: string };

  const res = await app.handle(
    new Request(`http://localhost/v1/companies/${company.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug: "ing-fah" }),
    }),
  );
  expect(res.status).toBe(400);
  const body = await res.json();
  expect(body).toMatchObject({
    error: "Bad Request",
    message: "Slug must be uppercase letters and numbers only (e.g. ING)",
  });
});

test("PUT /v1/companies/:id duplicate slug returns 409", async () => {
  const db = await createTestDb();
  const app = createTestApp(db);
  const create1 = await app.handle(
    new Request("http://localhost/v1/companies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "First", slug: "CO1" }),
    }),
  );
  const create2 = await app.handle(
    new Request("http://localhost/v1/companies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Second", slug: "CO2" }),
    }),
  );
  const company1 = (await create1.json()) as { id: string };
  expect(create2.status).toBe(200);

  const res = await app.handle(
    new Request(`http://localhost/v1/companies/${company1.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug: "CO2" }),
    }),
  );
  expect(res.status).toBe(409);
  const body = await res.json();
  expect(body).toMatchObject({
    error: "Conflict",
    message: "Company slug already exists",
  });
});

test("DELETE /v1/companies/:id returns 204", async () => {
  const db = await createTestDb();
  const app = createTestApp(db);
  const createRes = await app.handle(
    new Request("http://localhost/v1/companies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "To Delete", slug: "del" }),
    }),
  );
  const company = (await createRes.json()) as { id: string };

  const res = await app.handle(
    new Request(`http://localhost/v1/companies/${company.id}`, {
      method: "DELETE",
    }),
  );
  expect(res.status).toBe(204);
});

test("DELETE /v1/companies/:id idempotent second DELETE returns 204", async () => {
  const db = await createTestDb();
  const app = createTestApp(db);
  const createRes = await app.handle(
    new Request("http://localhost/v1/companies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Twice", slug: "twice" }),
    }),
  );
  const company = (await createRes.json()) as { id: string };

  const res1 = await app.handle(
    new Request(`http://localhost/v1/companies/${company.id}`, {
      method: "DELETE",
    }),
  );
  expect(res1.status).toBe(204);

  const res2 = await app.handle(
    new Request(`http://localhost/v1/companies/${company.id}`, {
      method: "DELETE",
    }),
  );
  expect(res2.status).toBe(204);
});

test("DELETE /v1/companies/:id soft-deleted company returns 404 on GET", async () => {
  const db = await createTestDb();
  const app = createTestApp(db);
  const createRes = await app.handle(
    new Request("http://localhost/v1/companies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Soft Del", slug: "softdel" }),
    }),
  );
  const company = (await createRes.json()) as { id: string };

  const listBefore = await app.handle(new Request("http://localhost/v1/companies"));
  expect((await listBefore.json()) as unknown[]).toHaveLength(1);

  await app.handle(
    new Request(`http://localhost/v1/companies/${company.id}`, {
      method: "DELETE",
    }),
  );

  const listAfter = await app.handle(new Request("http://localhost/v1/companies"));
  expect((await listAfter.json()) as unknown[]).toHaveLength(0);

  const getRes = await app.handle(new Request(`http://localhost/v1/companies/${company.id}`));
  expect(getRes.status).toBe(404);
});
