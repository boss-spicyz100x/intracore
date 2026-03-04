import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { v7 as uuidv7 } from "uuid";
import { Elysia } from "elysia";
import { companies, employees } from "../src/db/schema.postgres";
import type { AnyDB } from "../src/db/tickets";
import { ticketsRouter } from "../src/routes/v1/tickets";
import { companiesRouter } from "../src/routes/v1/companies";
import { employeesRouter } from "../src/routes/v1/employees";
import { identityRouter } from "../src/routes/v1/identity";

function initSchema(sqlite: Database) {
  sqlite.run(`CREATE TABLE companies (
    id TEXT PRIMARY KEY,
    slug TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted_at TEXT
  )`);
  sqlite.run(`CREATE TABLE employees (
    id TEXT PRIMARY KEY,
    employee_number TEXT NOT NULL,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    phone_number TEXT NOT NULL,
    department TEXT,
    role TEXT,
    preferred_language TEXT NOT NULL DEFAULT 'en-US',
    company_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted_at TEXT,
    UNIQUE(company_id, employee_number)
  )`);
  sqlite.run(`CREATE TABLE tickets (
    id TEXT PRIMARY KEY,
    ticket_number TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'NEW',
    priority TEXT NOT NULL DEFAULT 'MEDIUM',
    category TEXT,
    assignee_id TEXT,
    reported_by_id TEXT NOT NULL,
    company_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    closed_at TEXT
  )`);
}

export function createTestDb(): AnyDB {
  const sqlite = new Database(":memory:");
  initSchema(sqlite);
  return drizzle(sqlite) as unknown as AnyDB;
}

export function createTestApp(db: AnyDB) {
  const healthResponse = () => ({
    status: "ok",
    timestamp: new Date().toISOString(),
  });
  return new Elysia()
    .get("/", healthResponse)
    .get("/health", healthResponse)
    .use(ticketsRouter(db))
    .use(companiesRouter(db))
    .use(employeesRouter(db))
    .use(identityRouter(db));
}

export async function seedCompanyAndEmployees(db: AnyDB) {
  const now = new Date().toISOString();
  const companyId = uuidv7();
  const reporterId = uuidv7();
  const assigneeId = uuidv7();

  await (db as any).insert(companies).values({
    id: companyId,
    slug: "ACME",
    name: "Acme Corp",
    description: null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  });

  await (db as any).insert(employees).values({
    id: reporterId,
    employeeNumber: "001",
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

  await (db as any).insert(employees).values({
    id: assigneeId,
    employeeNumber: "002",
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

export async function seedCompany(db: AnyDB, opts?: { slug?: string; name?: string }) {
  const now = new Date().toISOString();
  const companyId = uuidv7();
  const slug = opts?.slug ?? "TESTCO";
  const name = opts?.name ?? "Test Co";
  await (db as any).insert(companies).values({
    id: companyId,
    slug,
    name,
    description: null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  });
  return companyId;
}

export async function seedEmployee(
  db: AnyDB,
  companyId: string,
  opts?: { email?: string; employeeNumber?: string },
) {
  const now = new Date().toISOString();
  const employeeId = uuidv7();
  const email = opts?.email ?? `emp-${employeeId.slice(0, 8)}@test.com`;
  const employeeNumber = opts?.employeeNumber ?? "001";
  await (db as any).insert(employees).values({
    id: employeeId,
    employeeNumber,
    fullName: "Test Employee",
    email,
    phoneNumber: "+15551234567",
    department: null,
    role: null,
    preferredLanguage: "en-US",
    companyId,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  });
  return employeeId;
}
