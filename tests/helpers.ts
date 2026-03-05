import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { v7 as uuidv7 } from "uuid";
import { Elysia } from "elysia";
import { companies, employees, whitelists } from "../src/db/schema.postgres";
import type { AnyDB } from "../src/db/tickets";
import { ticketsRouter } from "../src/routes/v1/tickets";
import { companiesRouter } from "../src/routes/v1/companies";
import { employeesRouter } from "../src/routes/v1/employees";
import { authRouter } from "../src/routes/v1/auth";
import { whitelistsRouter } from "../src/routes/v1/whitelists";
import { sessionsRouter } from "../src/routes/v1/sessions";
import { authPlugin } from "../src/auth/middleware";

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
  sqlite.run(`CREATE TABLE whitelists (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL
  )`);
  sqlite.run(`CREATE TABLE sessions (
    id TEXT PRIMARY KEY,
    token_hash TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL
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
    .use(authRouter(db));
}

export async function createTestAppWithAuth(db: AnyDB, mockGitHubUser?: { email: string }) {
  const email = mockGitHubUser?.email ?? "earth@100x.fi";
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : (input as Request).url;
    if (url.includes("api.github.com/user") && !url.includes("/emails")) {
      return new Response(JSON.stringify({ email }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    if (url.includes("api.github.com/user/emails")) {
      return new Response(JSON.stringify([{ email, primary: true }]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    return originalFetch(input as RequestInfo, init);
  }) as typeof fetch;

  const now = new Date().toISOString();
  await (db as any).insert(whitelists).values([
    { id: uuidv7(), email: "earth@100x.fi", createdAt: now },
    { id: uuidv7(), email: "boss.spicyz@100x.fi", createdAt: now },
  ]);

  const healthResponse = () => ({
    status: "ok",
    timestamp: new Date().toISOString(),
  });

  const app = new Elysia()
    .get("/", healthResponse)
    .get("/health", healthResponse)
    .use(authRouter(db))
    .use(
      authPlugin(db)
        .use(ticketsRouter(db))
        .use(companiesRouter(db))
        .use(employeesRouter(db))
        .use(whitelistsRouter(db))
        .use(sessionsRouter(db)),
    );

  (app as any).restoreFetch = () => {
    globalThis.fetch = originalFetch;
  };

  return app;
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
