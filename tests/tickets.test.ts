import { test, expect } from "bun:test";
import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { v7 as uuidv7 } from "uuid";
import * as schema from "../src/db/schema";
import {
  listTickets,
  getTicketById,
  createTicket,
  updateTicket,
  closeTicket,
  countTicketsByCompany,
  getCompanyById,
  getEmployeeById,
} from "../src/db/tickets";
import { companies, employees } from "../src/db/schema";

async function createTestDb() {
  const sqlite = new Database(":memory:");
  const db = drizzle(sqlite, { schema });
  const migration = Bun.file(
    import.meta.dir + "/../drizzle/0000_free_satana.sql"
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

test("listTickets returns empty when no tickets", async () => {
  const db = await createTestDb();
  const result = await listTickets(db);
  expect(result).toEqual([]);
});

test("createTicket and listTickets", async () => {
  const db = await createTestDb();
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

  const ticketId = uuidv7();
  await createTicket(db, {
    id: ticketId,
    ticketNumber: "acme-00001",
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
  expect(list[0]!.ticketNumber).toBe("acme-00001");
  expect(list[0]!.assignee?.fullName).toBe("John Assignee");
  expect(list[0]!.reportedBy.fullName).toBe("Jane Reporter");
  expect(list[0]!.company.slug).toBe("acme");
});

test("getTicketById returns null for missing ticket", async () => {
  const db = await createTestDb();
  const result = await getTicketById(db, uuidv7());
  expect(result).toBeNull();
});

test("getTicketById returns ticket with relations", async () => {
  const db = await createTestDb();
  const now = new Date().toISOString();
  const companyId = uuidv7();
  const reporterId = uuidv7();

  await db.insert(companies).values({
    id: companyId,
    slug: "testco",
    name: "Test Co",
    description: null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  });

  await db.insert(employees).values({
    id: reporterId,
    employeeNumber: 1,
    fullName: "Reporter",
    email: "r@test.com",
    phoneNumber: "+15551111111",
    department: null,
    role: null,
    preferredLanguage: "en-US",
    companyId,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  });

  const ticketId = uuidv7();
  await createTicket(db, {
    id: ticketId,
    ticketNumber: "testco-00001",
    title: "Get me",
    companyId,
    reportedById: reporterId,
  });

  const ticket = await getTicketById(db, ticketId);
  expect(ticket).not.toBeNull();
  expect(ticket!.id).toBe(ticketId);
  expect(ticket!.title).toBe("Get me");
  expect(ticket!.assignee).toBeNull();
  expect(ticket!.reportedBy.fullName).toBe("Reporter");
});

test("updateTicket updates description and priority", async () => {
  const db = await createTestDb();
  const now = new Date().toISOString();
  const companyId = uuidv7();
  const reporterId = uuidv7();

  await db.insert(companies).values({
    id: companyId,
    slug: "upd",
    name: "Update Co",
    description: null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  });

  await db.insert(employees).values({
    id: reporterId,
    employeeNumber: 1,
    fullName: "R",
    email: "r@upd.com",
    phoneNumber: "+15550000000",
    department: null,
    role: null,
    preferredLanguage: "en-US",
    companyId,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  });

  const ticketId = uuidv7();
  await createTicket(db, {
    id: ticketId,
    ticketNumber: "upd-00001",
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

test("closeTicket sets closedAt and excludes from listTickets", async () => {
  const db = await createTestDb();
  const now = new Date().toISOString();
  const companyId = uuidv7();
  const reporterId = uuidv7();

  await db.insert(companies).values({
    id: companyId,
    slug: "close",
    name: "Close Co",
    description: null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  });

  await db.insert(employees).values({
    id: reporterId,
    employeeNumber: 1,
    fullName: "R",
    email: "r@close.com",
    phoneNumber: "+15550000001",
    department: null,
    role: null,
    preferredLanguage: "en-US",
    companyId,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  });

  const ticketId = uuidv7();
  await createTicket(db, {
    id: ticketId,
    ticketNumber: "close-00001",
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

test("countTicketsByCompany and getCompanyById", async () => {
  const db = await createTestDb();
  const now = new Date().toISOString();
  const companyId = uuidv7();
  const reporterId = uuidv7();

  await db.insert(companies).values({
    id: companyId,
    slug: "countco",
    name: "Count Co",
    description: null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  });

  await db.insert(employees).values({
    id: reporterId,
    employeeNumber: 1,
    fullName: "R",
    email: "r@count.com",
    phoneNumber: "+15550000002",
    department: null,
    role: null,
    preferredLanguage: "en-US",
    companyId,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  });

  const company = await getCompanyById(db, companyId);
  expect(company).not.toBeNull();
  expect(company!.slug).toBe("countco");

  expect(await countTicketsByCompany(db, companyId)).toBe(0);

  await createTicket(db, {
    id: uuidv7(),
    ticketNumber: "countco-00001",
    title: "First",
    companyId,
    reportedById: reporterId,
  });
  expect(await countTicketsByCompany(db, companyId)).toBe(1);

  await createTicket(db, {
    id: uuidv7(),
    ticketNumber: "countco-00002",
    title: "Second",
    companyId,
    reportedById: reporterId,
  });
  expect(await countTicketsByCompany(db, companyId)).toBe(2);
});
