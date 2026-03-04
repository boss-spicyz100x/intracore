import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { v7 as uuidv7 } from "uuid";
import { Elysia } from "elysia";
import * as schema from "../src/db/schema.sqlite";
import { companies, employees } from "../src/db/schema.sqlite";
import { ticketsRouter } from "../src/routes/v1/tickets";
import { companiesRouter } from "../src/routes/v1/companies";
import { employeesRouter } from "../src/routes/v1/employees";
import { identityRouter } from "../src/routes/v1/identity";

export async function createTestDb() {
  const sqlite = new Database(":memory:");
  const db = drizzle(sqlite, { schema });
  const migrationsDir = import.meta.dir + "/../migrations";
  const files = (await Bun.$`ls ${migrationsDir}/*.sql`.text())
    .trim()
    .split("\n")
    .filter(Boolean)
    .sort();
  for (const file of files) {
    const sql = await Bun.file(file).text();
    const statements = sql
      .split(/--> statement-breakpoint\n?/)
      .map((s) => s.trim())
      .filter(Boolean);
    for (const stmt of statements) {
      sqlite.run(stmt);
    }
  }
  return db;
}

export function createTestApp(db: Awaited<ReturnType<typeof createTestDb>>) {
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

export async function seedCompanyAndEmployees(db: Awaited<ReturnType<typeof createTestDb>>) {
  const now = new Date().toISOString();
  const companyId = uuidv7();
  const reporterId = uuidv7();
  const assigneeId = uuidv7();

  await db.insert(companies).values({
    id: companyId,
    slug: "ACME",
    name: "Acme Corp",
    description: null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  });

  await db.insert(employees).values({
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

  await db.insert(employees).values({
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

export async function seedCompany(
  db: Awaited<ReturnType<typeof createTestDb>>,
  opts?: { slug?: string; name?: string },
) {
  const now = new Date().toISOString();
  const companyId = uuidv7();
  const slug = opts?.slug ?? "TESTCO";
  const name = opts?.name ?? "Test Co";
  await db.insert(companies).values({
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
  db: Awaited<ReturnType<typeof createTestDb>>,
  companyId: string,
  opts?: { email?: string; employeeNumber?: string },
) {
  const now = new Date().toISOString();
  const employeeId = uuidv7();
  const email = opts?.email ?? `emp-${employeeId.slice(0, 8)}@test.com`;
  const employeeNumber = opts?.employeeNumber ?? "001";
  await db.insert(employees).values({
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
