import { test, expect } from "bun:test";
import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { v7 as uuidv7 } from "uuid";
import { Elysia } from "elysia";
import * as schema from "../src/db/schema";
import { companies, employees } from "../src/db/schema";
import { ticketsRouter } from "../src/routes/v1/tickets";

async function createTestDb() {
  const sqlite = new Database(":memory:");
  const db = drizzle(sqlite, { schema });
  const migration = Bun.file(
    import.meta.dir + "/../migrations/0000_free_satana.sql"
  );
  const sql = await migration.text();
  const statements = sql
    .split(/--> statement-breakpoint\n?/)
    .map((s) => s.trim())
    .filter(Boolean);
  for (const stmt of statements) {
    sqlite.run(stmt);
  }
  return db;
}

function createTestApp(db: Awaited<ReturnType<typeof createTestDb>>) {
  const healthResponse = () => ({
    status: "ok",
    timestamp: new Date().toISOString(),
  });
  return new Elysia()
    .get("/", healthResponse)
    .get("/health", healthResponse)
    .use(ticketsRouter(db));
}

async function seedCompanyAndEmployees(db: Awaited<ReturnType<typeof createTestDb>>) {
  const now = new Date().toISOString();
  const companyId = uuidv7();
  const reporterId = uuidv7();
  const assigneeId = uuidv7();

  await db.insert(companies).values({
    id: companyId,
    slug: "acme",
    name: "Acme Corp",
    description: null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  });

  await db.insert(employees).values({
    id: reporterId,
    employeeNumber: 1,
    fullName: "Jane Reporter",
    email: "jane@acme.com",
    phoneNumber: "+15551234567",
    department: null,
    role: null,
    preferredLanguage: "en-US",
    companyId,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  });

  await db.insert(employees).values({
    id: assigneeId,
    employeeNumber: 2,
    fullName: "John Assignee",
    email: "john@acme.com",
    phoneNumber: "+15559876543",
    department: null,
    role: null,
    preferredLanguage: "en-US",
    companyId,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  });

  return { companyId, reporterId, assigneeId };
}

test("GET / returns 200 with status ok", async () => {
  const db = await createTestDb();
  const app = createTestApp(db);
  const res = await app.handle(new Request("http://localhost/"));
  expect(res.status).toBe(200);
  const body = await res.json();
  expect(body).toMatchObject({ status: "ok" });
  expect(body.timestamp).toBeDefined();
});

test("GET /health returns 200 with status ok", async () => {
  const db = await createTestDb();
  const app = createTestApp(db);
  const res = await app.handle(new Request("http://localhost/health"));
  expect(res.status).toBe(200);
  const body = await res.json();
  expect(body).toMatchObject({ status: "ok" });
  expect(body.timestamp).toBeDefined();
});

test("GET /v1/tickets returns [] on empty DB", async () => {
  const db = await createTestDb();
  const app = createTestApp(db);
  const res = await app.handle(new Request("http://localhost/v1/tickets"));
  expect(res.status).toBe(200);
  const body = await res.json();
  expect(body).toEqual([]);
});

test("GET /v1/tickets returns only open tickets", async () => {
  const db = await createTestDb();
  const { companyId, reporterId, assigneeId } = await seedCompanyAndEmployees(db);
  const app = createTestApp(db);

  const createRes = await app.handle(
    new Request("http://localhost/v1/tickets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Open ticket",
        companyId,
        reportedById: reporterId,
        assigneeId,
      }),
    })
  );
  expect(createRes.status).toBe(200);
  const ticket = (await createRes.json()) as { id: string };

  const listRes1 = await app.handle(new Request("http://localhost/v1/tickets"));
  expect(listRes1.status).toBe(200);
  expect(await listRes1.json()).toHaveLength(1);

  const deleteRes = await app.handle(
    new Request(`http://localhost/v1/tickets/${ticket.id}`, { method: "DELETE" })
  );
  expect(deleteRes.status).toBe(204);

  const listRes2 = await app.handle(new Request("http://localhost/v1/tickets"));
  expect(listRes2.status).toBe(200);
  expect(await listRes2.json()).toHaveLength(0);
});

test("POST /v1/tickets missing required fields returns 422", async () => {
  const db = await createTestDb();
  const app = createTestApp(db);
  const res = await app.handle(
    new Request("http://localhost/v1/tickets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "No company" }),
    })
  );
  expect(res.status).toBe(422);
});

test("POST /v1/tickets invalid UUID for companyId returns 422", async () => {
  const db = await createTestDb();
  const { reporterId } = await seedCompanyAndEmployees(db);
  const app = createTestApp(db);
  const res = await app.handle(
    new Request("http://localhost/v1/tickets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Test",
        companyId: "not-a-uuid",
        reportedById: reporterId,
      }),
    })
  );
  expect(res.status).toBe(422);
});

test("POST /v1/tickets non-existent companyId returns 404", async () => {
  const db = await createTestDb();
  const { reporterId } = await seedCompanyAndEmployees(db);
  const app = createTestApp(db);
  const res = await app.handle(
    new Request("http://localhost/v1/tickets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Test",
        companyId: uuidv7(),
        reportedById: reporterId,
      }),
    })
  );
  expect(res.status).toBe(404);
  const body = await res.json();
  expect(body).toMatchObject({ error: "Not Found", message: "Company not found" });
});

test("POST /v1/tickets non-existent reportedById returns 404", async () => {
  const db = await createTestDb();
  const { companyId } = await seedCompanyAndEmployees(db);
  const app = createTestApp(db);
  const res = await app.handle(
    new Request("http://localhost/v1/tickets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Test",
        companyId,
        reportedById: uuidv7(),
      }),
    })
  );
  expect(res.status).toBe(404);
  const body = await res.json();
  expect(body).toMatchObject({
    error: "Not Found",
    message: "Reporter employee not found",
  });
});

test("POST /v1/tickets non-existent assigneeId returns 404", async () => {
  const db = await createTestDb();
  const { companyId, reporterId } = await seedCompanyAndEmployees(db);
  const app = createTestApp(db);
  const res = await app.handle(
    new Request("http://localhost/v1/tickets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Test",
        companyId,
        reportedById: reporterId,
        assigneeId: uuidv7(),
      }),
    })
  );
  expect(res.status).toBe(404);
  const body = await res.json();
  expect(body).toMatchObject({
    error: "Not Found",
    message: "Assignee employee not found",
  });
});

test("POST /v1/tickets valid minimal payload returns 200 with ticket", async () => {
  const db = await createTestDb();
  const { companyId, reporterId } = await seedCompanyAndEmployees(db);
  const app = createTestApp(db);
  const res = await app.handle(
    new Request("http://localhost/v1/tickets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "First ticket",
        companyId,
        reportedById: reporterId,
      }),
    })
  );
  expect(res.status).toBe(200);
  const body = (await res.json()) as Record<string, unknown>;
  expect(body.title).toBe("First ticket");
  expect(body.ticketNumber).toBe("acme-00001");
  expect(body.id).toBeDefined();
  expect(body.reportedBy).toMatchObject({ fullName: "Jane Reporter" });
  expect(body.company).toMatchObject({ slug: "acme" });
});

test("POST /v1/tickets sequential creates increment ticket numbers", async () => {
  const db = await createTestDb();
  const { companyId, reporterId } = await seedCompanyAndEmployees(db);
  const app = createTestApp(db);

  const res1 = await app.handle(
    new Request("http://localhost/v1/tickets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "First",
        companyId,
        reportedById: reporterId,
      }),
    })
  );
  const ticket1 = (await res1.json()) as { ticketNumber: string };
  expect(ticket1.ticketNumber).toBe("acme-00001");

  const res2 = await app.handle(
    new Request("http://localhost/v1/tickets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Second",
        companyId,
        reportedById: reporterId,
      }),
    })
  );
  const ticket2 = (await res2.json()) as { ticketNumber: string };
  expect(ticket2.ticketNumber).toBe("acme-00002");
});

test("GET /v1/tickets/:id valid ticket returns 200 with relations", async () => {
  const db = await createTestDb();
  const { companyId, reporterId, assigneeId } = await seedCompanyAndEmployees(db);
  const app = createTestApp(db);

  const createRes = await app.handle(
    new Request("http://localhost/v1/tickets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Get me",
        companyId,
        reportedById: reporterId,
        assigneeId,
      }),
    })
  );
  const ticket = (await createRes.json()) as { id: string };

  const res = await app.handle(
    new Request(`http://localhost/v1/tickets/${ticket.id}`)
  );
  expect(res.status).toBe(200);
  const body = (await res.json()) as Record<string, unknown>;
  expect(body.id).toBe(ticket.id);
  expect(body.title).toBe("Get me");
  expect(body.reportedBy).toMatchObject({ fullName: "Jane Reporter" });
  expect(body.assignee).toMatchObject({ fullName: "John Assignee" });
  expect(body.company).toMatchObject({ slug: "acme" });
});

test("GET /v1/tickets/:id non-existent UUID returns 404", async () => {
  const db = await createTestDb();
  const app = createTestApp(db);
  const res = await app.handle(
    new Request(`http://localhost/v1/tickets/${uuidv7()}`)
  );
  expect(res.status).toBe(404);
  const body = await res.json();
  expect(body).toMatchObject({ error: "Not Found", message: "Ticket not found" });
});

test("GET /v1/tickets/:id invalid UUID format returns 422", async () => {
  const db = await createTestDb();
  const app = createTestApp(db);
  const res = await app.handle(
    new Request("http://localhost/v1/tickets/not-a-uuid")
  );
  expect(res.status).toBe(422);
});

test("PUT /v1/tickets/:id non-existent ticket returns 404", async () => {
  const db = await createTestDb();
  const app = createTestApp(db);
  const res = await app.handle(
    new Request(`http://localhost/v1/tickets/${uuidv7()}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ description: "Updated" }),
    })
  );
  expect(res.status).toBe(404);
});

test("PUT /v1/tickets/:id valid update returns 200 with updated values", async () => {
  const db = await createTestDb();
  const { companyId, reporterId } = await seedCompanyAndEmployees(db);
  const app = createTestApp(db);

  const createRes = await app.handle(
    new Request("http://localhost/v1/tickets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "To update",
        description: "Old",
        priority: "LOW",
        companyId,
        reportedById: reporterId,
      }),
    })
  );
  const ticket = (await createRes.json()) as { id: string };

  const res = await app.handle(
    new Request(`http://localhost/v1/tickets/${ticket.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ description: "New desc", priority: "HIGH" }),
    })
  );
  expect(res.status).toBe(200);
  const body = (await res.json()) as Record<string, unknown>;
  expect(body.description).toBe("New desc");
  expect(body.priority).toBe("HIGH");
});

test("DELETE /v1/tickets/:id closes ticket returns 204", async () => {
  const db = await createTestDb();
  const { companyId, reporterId } = await seedCompanyAndEmployees(db);
  const app = createTestApp(db);

  const createRes = await app.handle(
    new Request("http://localhost/v1/tickets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "To close",
        companyId,
        reportedById: reporterId,
      }),
    })
  );
  const ticket = (await createRes.json()) as { id: string };

  const res = await app.handle(
    new Request(`http://localhost/v1/tickets/${ticket.id}`, {
      method: "DELETE",
    })
  );
  expect(res.status).toBe(204);
});

test("DELETE /v1/tickets/:id idempotent second DELETE returns 204", async () => {
  const db = await createTestDb();
  const { companyId, reporterId } = await seedCompanyAndEmployees(db);
  const app = createTestApp(db);

  const createRes = await app.handle(
    new Request("http://localhost/v1/tickets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "To close twice",
        companyId,
        reportedById: reporterId,
      }),
    })
  );
  const ticket = (await createRes.json()) as { id: string };

  const res1 = await app.handle(
    new Request(`http://localhost/v1/tickets/${ticket.id}`, {
      method: "DELETE",
    })
  );
  expect(res1.status).toBe(204);

  const res2 = await app.handle(
    new Request(`http://localhost/v1/tickets/${ticket.id}`, {
      method: "DELETE",
    })
  );
  expect(res2.status).toBe(204);
});

test("DELETE /v1/tickets/:id closed ticket absent from GET /v1/tickets", async () => {
  const db = await createTestDb();
  const { companyId, reporterId } = await seedCompanyAndEmployees(db);
  const app = createTestApp(db);

  const createRes = await app.handle(
    new Request("http://localhost/v1/tickets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Will be closed",
        companyId,
        reportedById: reporterId,
      }),
    })
  );
  const ticket = (await createRes.json()) as { id: string };

  const listBefore = await app.handle(new Request("http://localhost/v1/tickets"));
  expect(await listBefore.json()).toHaveLength(1);

  await app.handle(
    new Request(`http://localhost/v1/tickets/${ticket.id}`, {
      method: "DELETE",
    })
  );

  const listAfter = await app.handle(new Request("http://localhost/v1/tickets"));
  const tickets = (await listAfter.json()) as unknown[];
  expect(tickets).toHaveLength(0);
  expect(tickets.find((t: { id: string }) => t.id === ticket.id)).toBeUndefined();
});
