import { test, expect } from "bun:test";
import { v7 as uuidv7 } from "uuid";
import { createTestDb } from "../helpers";
import {
  listTickets,
  getTicketById,
  createTicket,
  updateTicket,
  closeTicket,
  countTicketsByCompany,
  getTicketHistory,
  getCompanyById,
  getEmployeeById,
} from "../../src/db/tickets";
import { companies, employees } from "../../src/db/schema.sqlite";

async function seedCompanyAndEmployee(db: Awaited<ReturnType<typeof createTestDb>>) {
  const now = new Date().toISOString();
  const companyId = uuidv7();
  const reporterId = uuidv7();
  await db.insert(companies).values({
    id: companyId,
    slug: "ING",
    name: "Ingfah",
    description: null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  });
  await db.insert(employees).values({
    id: reporterId,
    employeeNumber: "001",
    fullName: "Jane",
    email: "jane@ing.com",
    phoneNumber: "+15551111111",
    department: null,
    role: null,
    preferredLanguage: "en-US",
    companyId,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  });
  return { companyId, reporterId };
}

test("listTickets returns empty when no tickets", async () => {
  const db = await createTestDb();
  const result = await listTickets(db);
  expect(result).toEqual([]);
});

test("listTickets returns only open tickets", async () => {
  const db = await createTestDb();
  const { companyId, reporterId } = await seedCompanyAndEmployee(db);
  const ticketId = uuidv7();
  await createTicket(db, {
    id: ticketId,
    ticketNumber: "ING-00001",
    title: "Open",
    companyId,
    reportedById: reporterId,
  });
  await closeTicket(db, ticketId);
  const list = await listTickets(db);
  expect(list).toHaveLength(0);
});

test("listTickets returns tickets with relations", async () => {
  const db = await createTestDb();
  const { companyId, reporterId } = await seedCompanyAndEmployee(db);
  await createTicket(db, {
    id: uuidv7(),
    ticketNumber: "ING-00001",
    title: "Test",
    companyId,
    reportedById: reporterId,
  });
  const result = await listTickets(db);
  expect(result).toHaveLength(1);
  expect(result[0]!.title).toBe("Test");
  expect(result[0]!.reportedBy.fullName).toBe("Jane");
  expect(result[0]!.company.slug).toBe("ING");
});

test("getTicketById returns ticket when found", async () => {
  const db = await createTestDb();
  const { companyId, reporterId } = await seedCompanyAndEmployee(db);
  const ticketId = uuidv7();
  await createTicket(db, {
    id: ticketId,
    ticketNumber: "ING-00001",
    title: "Get me",
    companyId,
    reportedById: reporterId,
  });
  const result = await getTicketById(db, ticketId);
  expect(result).not.toBeNull();
  expect(result!.id).toBe(ticketId);
  expect(result!.title).toBe("Get me");
});

test("getTicketById returns null when not found", async () => {
  const db = await createTestDb();
  const result = await getTicketById(db, uuidv7());
  expect(result).toBeNull();
});

test("createTicket inserts and returns ticket", async () => {
  const db = await createTestDb();
  const { companyId, reporterId } = await seedCompanyAndEmployee(db);
  const id = uuidv7();
  const result = await createTicket(db, {
    id,
    ticketNumber: "ING-00001",
    title: "New",
    description: "Desc",
    companyId,
    reportedById: reporterId,
    priority: "HIGH",
    category: "IT",
  });
  expect(result.id).toBe(id);
  expect(result.title).toBe("New");
  expect(result.status).toBe("NEW");
  expect(result.priority).toBe("HIGH");
  expect(result.category).toBe("IT");
  expect(result.closedAt).toBeNull();
});

test("updateTicket updates and returns ticket", async () => {
  const db = await createTestDb();
  const { companyId, reporterId } = await seedCompanyAndEmployee(db);
  const ticketId = uuidv7();
  await createTicket(db, {
    id: ticketId,
    ticketNumber: "ING-00001",
    title: "Original",
    companyId,
    reportedById: reporterId,
  });
  const result = await updateTicket(db, ticketId, {
    title: "Updated",
    description: "New desc",
    status: "PENDING",
    priority: "HIGH",
  });
  expect(result).not.toBeNull();
  expect(result!.title).toBe("Updated");
  expect(result!.description).toBe("New desc");
  expect(result!.status).toBe("PENDING");
  expect(result!.priority).toBe("HIGH");
});

test("updateTicket partial update", async () => {
  const db = await createTestDb();
  const { companyId, reporterId } = await seedCompanyAndEmployee(db);
  const ticketId = uuidv7();
  await createTicket(db, {
    id: ticketId,
    ticketNumber: "ING-00001",
    title: "Original",
    companyId,
    reportedById: reporterId,
  });
  const result = await updateTicket(db, ticketId, { assigneeId: null });
  expect(result).not.toBeNull();
  expect(result!.title).toBe("Original");
});

test("updateTicket returns null when not found", async () => {
  const db = await createTestDb();
  const result = await updateTicket(db, uuidv7(), { title: "Nope" });
  expect(result).toBeNull();
});

test("closeTicket sets closedAt", async () => {
  const db = await createTestDb();
  const { companyId, reporterId } = await seedCompanyAndEmployee(db);
  const ticketId = uuidv7();
  await createTicket(db, {
    id: ticketId,
    ticketNumber: "ING-00001",
    title: "To close",
    companyId,
    reportedById: reporterId,
  });
  const result = await closeTicket(db, ticketId);
  expect(result).toBe(true);
  const ticket = await getTicketById(db, ticketId);
  expect(ticket!.closedAt).not.toBeNull();
  const list = await listTickets(db);
  expect(list).toHaveLength(0);
});

test("countTicketsByCompany returns count", async () => {
  const db = await createTestDb();
  const { companyId, reporterId } = await seedCompanyAndEmployee(db);
  expect(await countTicketsByCompany(db, companyId)).toBe(0);
  await createTicket(db, {
    id: uuidv7(),
    ticketNumber: "ING-00001",
    title: "First",
    companyId,
    reportedById: reporterId,
  });
  expect(await countTicketsByCompany(db, companyId)).toBe(1);
  await createTicket(db, {
    id: uuidv7(),
    ticketNumber: "ING-00002",
    title: "Second",
    companyId,
    reportedById: reporterId,
  });
  expect(await countTicketsByCompany(db, companyId)).toBe(2);
});

test("getCompanyById returns company when found", async () => {
  const db = await createTestDb();
  const { companyId } = await seedCompanyAndEmployee(db);
  const result = await getCompanyById(db, companyId);
  expect(result).not.toBeNull();
  expect(result!.slug).toBe("ING");
});

test("getCompanyById returns null when not found", async () => {
  const db = await createTestDb();
  const result = await getCompanyById(db, uuidv7());
  expect(result).toBeNull();
});

test("getCompanyById returns null when soft-deleted", async () => {
  const db = await createTestDb();
  const now = new Date().toISOString();
  const companyId = uuidv7();
  await db.insert(companies).values({
    id: companyId,
    slug: "DEL",
    name: "Deleted",
    description: null,
    createdAt: now,
    updatedAt: now,
    deletedAt: now,
  });
  const result = await getCompanyById(db, companyId);
  expect(result).toBeNull();
});

test("getEmployeeById returns employee when found", async () => {
  const db = await createTestDb();
  const { reporterId } = await seedCompanyAndEmployee(db);
  const result = await getEmployeeById(db, reporterId);
  expect(result).not.toBeNull();
});

test("getEmployeeById returns null when not found", async () => {
  const db = await createTestDb();
  const result = await getEmployeeById(db, uuidv7());
  expect(result).toBeNull();
});

test("getEmployeeById returns null when soft-deleted", async () => {
  const db = await createTestDb();
  const { companyId } = await seedCompanyAndEmployee(db);
  const id = uuidv7();
  const now = new Date().toISOString();
  await db.insert(employees).values({
    id,
    employeeNumber: "002",
    fullName: "Deleted",
    email: "del@ing.com",
    phoneNumber: "+15552222222",
    department: null,
    role: null,
    preferredLanguage: "en-US",
    companyId,
    createdAt: now,
    updatedAt: now,
    deletedAt: now,
  });
  const result = await getEmployeeById(db, id);
  expect(result).toBeNull();
});

test("getTicketHistory returns tickets by employeeId", async () => {
  const db = await createTestDb();
  const { companyId, reporterId } = await seedCompanyAndEmployee(db);
  await createTicket(db, {
    id: uuidv7(),
    ticketNumber: "ING-00001",
    title: "T1",
    companyId,
    reportedById: reporterId,
  });
  await createTicket(db, {
    id: uuidv7(),
    ticketNumber: "ING-00002",
    title: "T2",
    companyId,
    reportedById: reporterId,
  });
  const result = await getTicketHistory(db, { employeeId: reporterId });
  expect(result).toHaveLength(2);
});

test("getTicketHistory filters by status", async () => {
  const db = await createTestDb();
  const { companyId, reporterId } = await seedCompanyAndEmployee(db);
  const t1 = uuidv7();
  const t2 = uuidv7();
  await createTicket(db, {
    id: t1,
    ticketNumber: "ING-00001",
    title: "New",
    companyId,
    reportedById: reporterId,
  });
  await createTicket(db, {
    id: t2,
    ticketNumber: "ING-00002",
    title: "Pending",
    companyId,
    reportedById: reporterId,
  });
  await updateTicket(db, t2, { status: "PENDING" });
  const result = await getTicketHistory(db, {
    employeeId: reporterId,
    status: "PENDING",
  });
  expect(result).toHaveLength(1);
  expect(result[0]!.status).toBe("PENDING");
});

test("getTicketHistory filters by category", async () => {
  const db = await createTestDb();
  const { companyId, reporterId } = await seedCompanyAndEmployee(db);
  await createTicket(db, {
    id: uuidv7(),
    ticketNumber: "ING-00001",
    title: "IT",
    companyId,
    reportedById: reporterId,
    category: "IT",
  });
  await createTicket(db, {
    id: uuidv7(),
    ticketNumber: "ING-00002",
    title: "Fac",
    companyId,
    reportedById: reporterId,
    category: "FACILITIES",
  });
  const result = await getTicketHistory(db, {
    employeeId: reporterId,
    category: "IT",
  });
  expect(result).toHaveLength(1);
  expect(result[0]!.category).toBe("IT");
});

test("getTicketHistory filters by priority", async () => {
  const db = await createTestDb();
  const { companyId, reporterId } = await seedCompanyAndEmployee(db);
  await createTicket(db, {
    id: uuidv7(),
    ticketNumber: "ING-00001",
    title: "High",
    companyId,
    reportedById: reporterId,
    priority: "HIGH",
  });
  await createTicket(db, {
    id: uuidv7(),
    ticketNumber: "ING-00002",
    title: "Low",
    companyId,
    reportedById: reporterId,
    priority: "LOW",
  });
  const result = await getTicketHistory(db, {
    employeeId: reporterId,
    priority: "HIGH",
  });
  expect(result).toHaveLength(1);
  expect(result[0]!.priority).toBe("HIGH");
});

test("getTicketHistory filters by dateFrom and dateTo", async () => {
  const db = await createTestDb();
  const { companyId, reporterId } = await seedCompanyAndEmployee(db);
  const t1 = uuidv7();
  const t2 = uuidv7();
  await createTicket(db, {
    id: t1,
    ticketNumber: "ING-00001",
    title: "Early",
    companyId,
    reportedById: reporterId,
  });
  const early = await getTicketById(db, t1);
  const dateFrom = early!.createdAt;
  await createTicket(db, {
    id: t2,
    ticketNumber: "ING-00002",
    title: "Late",
    companyId,
    reportedById: reporterId,
  });
  const late = await getTicketById(db, t2);
  const dateTo = late!.createdAt;
  const result = await getTicketHistory(db, {
    employeeId: reporterId,
    dateFrom,
    dateTo,
  });
  expect(result).toHaveLength(2);
});
