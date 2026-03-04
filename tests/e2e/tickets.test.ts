import { test, expect } from "bun:test";
import { v7 as uuidv7 } from "uuid";
import {
  createTestDb,
  createTestApp,
  seedCompanyAndEmployees,
  seedCompany,
  seedEmployee,
} from "../helpers";
import {
  listTickets,
  getTicketById,
  createTicket,
  updateTicket,
  closeTicket,
  countTicketsByCompany,
  getCompanyById,
} from "../../src/db/tickets";
import { tickets } from "../../src/db/schema.postgres";

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
    }),
  );
  expect(createRes.status).toBe(200);
  const ticket = (await createRes.json()) as { id: string };

  const listRes1 = await app.handle(new Request("http://localhost/v1/tickets"));
  expect(listRes1.status).toBe(200);
  expect(await listRes1.json()).toHaveLength(1);

  const deleteRes = await app.handle(
    new Request(`http://localhost/v1/tickets/${ticket.id}`, { method: "DELETE" }),
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
    }),
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
    }),
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
    }),
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
    }),
  );
  expect(res.status).toBe(404);
  const body = await res.json();
  expect(body).toMatchObject({
    error: "Not Found",
    message: "Reporter employee not found",
  });
});

test("POST /v1/tickets empty string assigneeId returns 422", async () => {
  const db = await createTestDb();
  const { companyId, reporterId } = await seedCompanyAndEmployees(db);
  const app = createTestApp(db);
  const res = await app.handle(
    new Request("http://localhost/v1/tickets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "No Assignee",
        companyId,
        reportedById: reporterId,
        assigneeId: "",
      }),
    }),
  );
  expect(res.status).toBe(422);
});

test("POST /v1/tickets null assigneeId treated as no assignee returns 200", async () => {
  const db = await createTestDb();
  const { companyId, reporterId } = await seedCompanyAndEmployees(db);
  const app = createTestApp(db);
  const res = await app.handle(
    new Request("http://localhost/v1/tickets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "No Assignee",
        companyId,
        reportedById: reporterId,
        assigneeId: null,
      }),
    }),
  );
  expect(res.status).toBe(200);
  const body = (await res.json()) as Record<string, unknown>;
  expect(body.assignee).toBeNull();
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
    }),
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
    }),
  );
  expect(res.status).toBe(200);
  const body = (await res.json()) as Record<string, unknown>;
  expect(body.title).toBe("First ticket");
  expect(body.ticketNumber).toBe("ACME-00001");
  expect(body.id).toBeDefined();
  expect(body.reportedBy).toMatchObject({ fullName: "Jane Reporter" });
  expect(body.company).toMatchObject({ slug: "ACME" });
});

test("POST /v1/tickets accepts lowercase category and priority returns 200", async () => {
  const db = await createTestDb();
  const { companyId, reporterId } = await seedCompanyAndEmployees(db);
  const app = createTestApp(db);
  const res = await app.handle(
    new Request("http://localhost/v1/tickets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Facilities ticket",
        companyId,
        reportedById: reporterId,
        category: "facilities",
        priority: "high",
      }),
    }),
  );
  expect(res.status).toBe(200);
  const body = (await res.json()) as Record<string, unknown>;
  expect(body.category).toBe("FACILITIES");
  expect(body.priority).toBe("HIGH");
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
    }),
  );
  const ticket1 = (await res1.json()) as { ticketNumber: string };
  expect(ticket1.ticketNumber).toBe("ACME-00001");

  const res2 = await app.handle(
    new Request("http://localhost/v1/tickets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Second",
        companyId,
        reportedById: reporterId,
      }),
    }),
  );
  const ticket2 = (await res2.json()) as { ticketNumber: string };
  expect(ticket2.ticketNumber).toBe("ACME-00002");
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
    }),
  );
  const ticket = (await createRes.json()) as { id: string };

  const res = await app.handle(new Request(`http://localhost/v1/tickets/${ticket.id}`));
  expect(res.status).toBe(200);
  const body = (await res.json()) as Record<string, unknown>;
  expect(body.id).toBe(ticket.id);
  expect(body.title).toBe("Get me");
  expect(body.reportedBy).toMatchObject({ fullName: "Jane Reporter" });
  expect(body.assignee).toMatchObject({ fullName: "John Assignee" });
  expect(body.company).toMatchObject({ slug: "ACME" });
});

test("GET /v1/tickets/:id non-existent UUID returns 404", async () => {
  const db = await createTestDb();
  const app = createTestApp(db);
  const res = await app.handle(new Request(`http://localhost/v1/tickets/${uuidv7()}`));
  expect(res.status).toBe(404);
  const body = await res.json();
  expect(body).toMatchObject({ error: "Not Found", message: "Ticket not found" });
});

test("GET /v1/tickets/:id invalid UUID format returns 422", async () => {
  const db = await createTestDb();
  const app = createTestApp(db);
  const res = await app.handle(new Request("http://localhost/v1/tickets/not-a-uuid"));
  expect(res.status).toBe(422);
});

test("GET /v1/tickets/number/:ticketNumber returns ticket with relations", async () => {
  const db = await createTestDb();
  const { companyId, reporterId, assigneeId } = await seedCompanyAndEmployees(db);
  const app = createTestApp(db);

  const createRes = await app.handle(
    new Request("http://localhost/v1/tickets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Find by number",
        companyId,
        reportedById: reporterId,
        assigneeId,
      }),
    }),
  );
  const ticket = (await createRes.json()) as { ticketNumber: string; id: string };
  expect(ticket.ticketNumber).toBe("ACME-00001");

  const res = await app.handle(
    new Request(`http://localhost/v1/tickets/number/${ticket.ticketNumber}`),
  );
  expect(res.status).toBe(200);
  const body = (await res.json()) as Record<string, unknown>;
  expect(body.id).toBe(ticket.id);
  expect(body.ticketNumber).toBe("ACME-00001");
  expect(body.title).toBe("Find by number");
  expect(body.reportedBy).toMatchObject({ fullName: "Jane Reporter" });
  expect(body.assignee).toMatchObject({ fullName: "John Assignee" });
  expect(body.company).toMatchObject({ slug: "ACME" });
});

test("GET /v1/tickets/number/:ticketNumber non-existent returns 404", async () => {
  const db = await createTestDb();
  const app = createTestApp(db);
  const res = await app.handle(new Request("http://localhost/v1/tickets/number/ACME-99999"));
  expect(res.status).toBe(404);
  const body = await res.json();
  expect(body).toMatchObject({ error: "Not Found", message: "Ticket not found" });
});

test("GET /v1/tickets/number/:ticketNumber invalid format returns 422", async () => {
  const db = await createTestDb();
  const app = createTestApp(db);
  const res = await app.handle(new Request("http://localhost/v1/tickets/number/not-valid-format"));
  expect(res.status).toBe(422);
});

test("GET /v1/tickets/history without employeeId returns 400", async () => {
  const db = await createTestDb();
  const app = createTestApp(db);
  const res = await app.handle(new Request("http://localhost/v1/tickets/history"));
  expect(res.status).toBe(400);
  const body = await res.json();
  expect(body).toEqual({ error: "Bad Request", message: "employeeId is required" });
});

test("GET /v1/tickets/history invalid status returns 400", async () => {
  const db = await createTestDb();
  const { reporterId } = await seedCompanyAndEmployees(db);
  const app = createTestApp(db);
  const res = await app.handle(
    new Request(`http://localhost/v1/tickets/history?employeeId=${reporterId}&status=INVALID`),
  );
  expect(res.status).toBe(400);
  const body = (await res.json()) as { message: string };
  expect(body.message).toMatch(/NEW|PENDING|RESOLVED|CANCELLED|CLOSED/);
});

test("GET /v1/tickets/history invalid category returns 400", async () => {
  const db = await createTestDb();
  const { reporterId } = await seedCompanyAndEmployees(db);
  const app = createTestApp(db);
  const res = await app.handle(
    new Request(`http://localhost/v1/tickets/history?employeeId=${reporterId}&category=INVALID`),
  );
  expect(res.status).toBe(400);
  const body = (await res.json()) as { message: string };
  expect(body.message).toMatch(/IT|FACILITIES|MISCELLANEOUS/);
});

test("GET /v1/tickets/history invalid priority returns 400", async () => {
  const db = await createTestDb();
  const { reporterId } = await seedCompanyAndEmployees(db);
  const app = createTestApp(db);
  const res = await app.handle(
    new Request(`http://localhost/v1/tickets/history?employeeId=${reporterId}&priority=INVALID`),
  );
  expect(res.status).toBe(400);
  const body = (await res.json()) as { message: string };
  expect(body.message).toMatch(/LOW|MEDIUM|HIGH/);
});

test("POST /v1/tickets invalid category returns 400", async () => {
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
        category: "INVALID",
      }),
    }),
  );
  expect(res.status).toBe(400);
});

test("POST /v1/tickets invalid priority returns 400", async () => {
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
        priority: "INVALID",
      }),
    }),
  );
  expect(res.status).toBe(400);
});

test("PUT /v1/tickets/number/:ticketNumber invalid status returns 400", async () => {
  const db = await createTestDb();
  const { companyId, reporterId } = await seedCompanyAndEmployees(db);
  const app = createTestApp(db);

  const createRes = await app.handle(
    new Request("http://localhost/v1/tickets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Update status",
        companyId,
        reportedById: reporterId,
      }),
    }),
  );
  const ticket = (await createRes.json()) as { ticketNumber: string };

  const res = await app.handle(
    new Request(`http://localhost/v1/tickets/number/${ticket.ticketNumber}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "INVALID" }),
    }),
  );
  expect(res.status).toBe(400);
});

test("GET /v1/tickets/number/:ticketNumber accepts lowercase and returns ticket", async () => {
  const db = await createTestDb();
  const { companyId, reporterId } = await seedCompanyAndEmployees(db);
  const app = createTestApp(db);

  const createRes = await app.handle(
    new Request("http://localhost/v1/tickets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Lowercase lookup",
        companyId,
        reportedById: reporterId,
      }),
    }),
  );
  expect(createRes.status).toBe(200);
  const ticket = (await createRes.json()) as { ticketNumber: string };
  const ticketNumber = ticket.ticketNumber;

  const res = await app.handle(
    new Request(`http://localhost/v1/tickets/number/${ticketNumber.toLowerCase()}`),
  );
  expect(res.status).toBe(200);
  const body = (await res.json()) as Record<string, unknown>;
  expect(body.ticketNumber).toBe("ACME-00001");
  expect(body.title).toBeDefined();
});

test("GET /v1/tickets/number/:ticketNumber returns 404 for orphaned ticket data", async () => {
  const db = await createTestDb();
  const app = createTestApp(db);
  await seedCompanyAndEmployees(db);

  const now = new Date().toISOString();
  await (db as any).insert(tickets).values({
    id: uuidv7(),
    ticketNumber: "ORPHAN-00001",
    title: "Orphan",
    companyId: uuidv7(),
    reportedById: uuidv7(),
    status: "NEW",
    priority: "MEDIUM",
    createdAt: now,
    updatedAt: now,
    closedAt: null,
  });

  const res = await app.handle(new Request("http://localhost/v1/tickets/number/ORPHAN-00001"));
  expect(res.status).toBe(404);
  const body = await res.json();
  expect(body).toMatchObject({ error: "Not Found", message: "Ticket not found" });
});

test("PUT /v1/tickets/number/:ticketNumber valid update returns 200 with updated values", async () => {
  const db = await createTestDb();
  const { companyId, reporterId } = await seedCompanyAndEmployees(db);
  const app = createTestApp(db);

  const createRes = await app.handle(
    new Request("http://localhost/v1/tickets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Original title",
        description: "Old desc",
        priority: "LOW",
        companyId,
        reportedById: reporterId,
      }),
    }),
  );
  const ticket = (await createRes.json()) as { ticketNumber: string };

  const res = await app.handle(
    new Request(`http://localhost/v1/tickets/number/${ticket.ticketNumber}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ description: "Updated desc", priority: "HIGH", status: "PENDING" }),
    }),
  );
  expect(res.status).toBe(200);
  const body = (await res.json()) as Record<string, unknown>;
  expect(body.ticketNumber).toBe(ticket.ticketNumber);
  expect(body.description).toBe("Updated desc");
  expect(body.priority).toBe("HIGH");
  expect(body.status).toBe("PENDING");
});

test("PUT /v1/tickets/number/:ticketNumber accepts lowercase status and category", async () => {
  const db = await createTestDb();
  const { companyId, reporterId } = await seedCompanyAndEmployees(db);
  const app = createTestApp(db);

  const createRes = await app.handle(
    new Request("http://localhost/v1/tickets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Update me", companyId, reportedById: reporterId }),
    }),
  );
  const ticket = (await createRes.json()) as { ticketNumber: string };

  const res = await app.handle(
    new Request(`http://localhost/v1/tickets/number/${ticket.ticketNumber}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: "pending",
        category: "facilities",
        priority: "high",
      }),
    }),
  );
  expect(res.status).toBe(200);
  const body = (await res.json()) as Record<string, unknown>;
  expect(body.status).toBe("PENDING");
  expect(body.category).toBe("FACILITIES");
  expect(body.priority).toBe("HIGH");
});

test("PUT /v1/tickets/number/:ticketNumber non-existent returns 404", async () => {
  const db = await createTestDb();
  const app = createTestApp(db);
  const res = await app.handle(
    new Request("http://localhost/v1/tickets/number/ACME-99999", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Nope" }),
    }),
  );
  expect(res.status).toBe(404);
  const body = await res.json();
  expect(body).toMatchObject({ error: "Not Found", message: "Ticket not found" });
});

test("PUT /v1/tickets/number/:ticketNumber invalid format returns 422", async () => {
  const db = await createTestDb();
  const app = createTestApp(db);
  const res = await app.handle(
    new Request("http://localhost/v1/tickets/number/not-valid-format", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Nope" }),
    }),
  );
  expect(res.status).toBe(422);
});

test("PUT /v1/tickets/number/:ticketNumber non-existent assigneeId returns 404", async () => {
  const db = await createTestDb();
  const { companyId, reporterId } = await seedCompanyAndEmployees(db);
  const app = createTestApp(db);

  const createRes = await app.handle(
    new Request("http://localhost/v1/tickets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Test", companyId, reportedById: reporterId }),
    }),
  );
  const ticket = (await createRes.json()) as { ticketNumber: string };

  const res = await app.handle(
    new Request(`http://localhost/v1/tickets/number/${ticket.ticketNumber}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assigneeId: uuidv7() }),
    }),
  );
  expect(res.status).toBe(404);
  const body = await res.json();
  expect(body).toMatchObject({ error: "Not Found", message: "Assignee employee not found" });
});

test("DELETE /v1/tickets/number/:ticketNumber closes ticket returns 204", async () => {
  const db = await createTestDb();
  const { companyId, reporterId } = await seedCompanyAndEmployees(db);
  const app = createTestApp(db);

  const createRes = await app.handle(
    new Request("http://localhost/v1/tickets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "To close by number",
        companyId,
        reportedById: reporterId,
      }),
    }),
  );
  const ticket = (await createRes.json()) as { ticketNumber: string };

  const res = await app.handle(
    new Request(`http://localhost/v1/tickets/number/${ticket.ticketNumber}`, {
      method: "DELETE",
    }),
  );
  expect(res.status).toBe(204);

  const listRes = await app.handle(new Request("http://localhost/v1/tickets"));
  expect(await listRes.json()).toHaveLength(0);
});

test("DELETE /v1/tickets/number/:ticketNumber non-existent returns 404", async () => {
  const db = await createTestDb();
  const app = createTestApp(db);
  const res = await app.handle(
    new Request("http://localhost/v1/tickets/number/ACME-99999", { method: "DELETE" }),
  );
  expect(res.status).toBe(404);
  const body = await res.json();
  expect(body).toMatchObject({ error: "Not Found", message: "Ticket not found" });
});

test("DELETE /v1/tickets/number/:ticketNumber invalid format returns 422", async () => {
  const db = await createTestDb();
  const app = createTestApp(db);
  const res = await app.handle(
    new Request("http://localhost/v1/tickets/number/not-valid-format", { method: "DELETE" }),
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
    }),
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
    }),
  );
  const ticket = (await createRes.json()) as { id: string };

  const res = await app.handle(
    new Request(`http://localhost/v1/tickets/${ticket.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ description: "New desc", priority: "HIGH" }),
    }),
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
    }),
  );
  const ticket = (await createRes.json()) as { id: string };

  const res = await app.handle(
    new Request(`http://localhost/v1/tickets/${ticket.id}`, {
      method: "DELETE",
    }),
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
    }),
  );
  const ticket = (await createRes.json()) as { id: string };

  const res1 = await app.handle(
    new Request(`http://localhost/v1/tickets/${ticket.id}`, {
      method: "DELETE",
    }),
  );
  expect(res1.status).toBe(204);

  const res2 = await app.handle(
    new Request(`http://localhost/v1/tickets/${ticket.id}`, {
      method: "DELETE",
    }),
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
    }),
  );
  const ticket = (await createRes.json()) as { id: string };

  const listBefore = await app.handle(new Request("http://localhost/v1/tickets"));
  expect(await listBefore.json()).toHaveLength(1);

  await app.handle(
    new Request(`http://localhost/v1/tickets/${ticket.id}`, {
      method: "DELETE",
    }),
  );

  const listAfter = await app.handle(new Request("http://localhost/v1/tickets"));
  const tickets = (await listAfter.json()) as unknown[];
  expect(tickets).toHaveLength(0);
  expect(tickets.find((t) => (t as { id: string }).id === ticket.id)).toBeUndefined();
});

test("listTickets returns empty when no tickets (DB)", async () => {
  const db = await createTestDb();
  const result = await listTickets(db);
  expect(result).toEqual([]);
});

test("createTicket and listTickets (DB)", async () => {
  const db = await createTestDb();
  const { companyId, reporterId, assigneeId } = await seedCompanyAndEmployees(db);
  const ticketId = uuidv7();
  await createTicket(db, {
    id: ticketId,
    ticketNumber: "ACME-00001",
    title: "Test ticket",
    description: "A test",
    companyId,
    reportedById: reporterId,
    assigneeId,
    priority: "HIGH",
    category: "IT",
  });
  const list = await listTickets(db);
  expect(list).toHaveLength(1);
  expect(list[0]!.title).toBe("Test ticket");
  expect(list[0]!.ticketNumber).toBe("ACME-00001");
  expect(list[0]!.assignee?.fullName).toBe("John Assignee");
  expect(list[0]!.reportedBy.fullName).toBe("Jane Reporter");
  expect(list[0]!.company.slug).toBe("ACME");
});

test("getTicketById returns null for missing ticket (DB)", async () => {
  const db = await createTestDb();
  const result = await getTicketById(db, uuidv7());
  expect(result).toBeNull();
});

test("getTicketById returns ticket with relations (DB)", async () => {
  const db = await createTestDb();
  const companyId = await seedCompany(db, { slug: "TESTCO" });
  const reporterId = await seedEmployee(db, companyId, {
    email: "r@test.com",
    employeeNumber: "001",
  });
  const ticketId = uuidv7();
  await createTicket(db, {
    id: ticketId,
    ticketNumber: "TESTCO-00001",
    title: "Get me",
    companyId,
    reportedById: reporterId,
  });
  const ticket = await getTicketById(db, ticketId);
  expect(ticket).not.toBeNull();
  expect(ticket!.id).toBe(ticketId);
  expect(ticket!.title).toBe("Get me");
  expect(ticket!.assignee).toBeNull();
  expect(ticket!.reportedBy.fullName).toBe("Test Employee");
});

test("updateTicket updates description and priority (DB)", async () => {
  const db = await createTestDb();
  const companyId = await seedCompany(db, { slug: "UPD" });
  const reporterId = await seedEmployee(db, companyId, {
    email: "r@upd.com",
    employeeNumber: "001",
  });
  const ticketId = uuidv7();
  await createTicket(db, {
    id: ticketId,
    ticketNumber: "UPD-00001",
    title: "Original",
    description: "Old desc",
    companyId,
    reportedById: reporterId,
    priority: "MEDIUM",
  });
  const updated = await updateTicket(db, ticketId, {
    description: "New desc",
    priority: "HIGH",
  });
  expect(updated).not.toBeNull();
  expect(updated!.description).toBe("New desc");
  expect(updated!.priority).toBe("HIGH");
});

test("closeTicket sets closedAt and excludes from listTickets (DB)", async () => {
  const db = await createTestDb();
  const companyId = await seedCompany(db, { slug: "CLOSE" });
  const reporterId = await seedEmployee(db, companyId, {
    email: "r@close.com",
    employeeNumber: "001",
  });
  const ticketId = uuidv7();
  await createTicket(db, {
    id: ticketId,
    ticketNumber: "CLOSE-00001",
    title: "To close",
    companyId,
    reportedById: reporterId,
  });
  expect(await listTickets(db)).toHaveLength(1);
  const closed = await closeTicket(db, ticketId);
  expect(closed).toBe(true);
  expect(await listTickets(db)).toHaveLength(0);
  const ticket = await getTicketById(db, ticketId);
  expect(ticket).not.toBeNull();
  expect(ticket!.closedAt).not.toBeNull();
});

test("countTicketsByCompany and getCompanyById (DB)", async () => {
  const db = await createTestDb();
  const companyId = await seedCompany(db, { slug: "COUNTCO" });
  const reporterId = await seedEmployee(db, companyId, {
    email: "r@count.com",
    employeeNumber: "001",
  });
  const company = await getCompanyById(db, companyId);
  expect(company).not.toBeNull();
  expect(company!.slug).toBe("COUNTCO");
  expect(await countTicketsByCompany(db, companyId)).toBe(0);
  await createTicket(db, {
    id: uuidv7(),
    ticketNumber: "COUNTCO-00001",
    title: "First",
    companyId,
    reportedById: reporterId,
  });
  expect(await countTicketsByCompany(db, companyId)).toBe(1);
  await createTicket(db, {
    id: uuidv7(),
    ticketNumber: "COUNTCO-00002",
    title: "Second",
    companyId,
    reportedById: reporterId,
  });
  expect(await countTicketsByCompany(db, companyId)).toBe(2);
});
