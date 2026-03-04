import { eq, isNull, count, and, gte, lte, inArray } from "drizzle-orm";
import type { BunSQLDatabase } from "drizzle-orm/bun-sql";
import { companies, employees, tickets } from "./schema.postgres";

export type AnyDB = BunSQLDatabase<any>;

export type TicketWithRelations = {
  id: string;
  ticketNumber: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  category: string | null;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
  assignee: { id: string; fullName: string; email: string } | null;
  reportedBy: { id: string; fullName: string; email: string };
  company: { id: string; slug: string; name: string };
};

type EmployeeRow = { id: string; fullName: string; email: string };
type CompanyRow = { id: string; slug: string; name: string };
type TicketRow = typeof tickets.$inferSelect;

async function fetchRelations(
  db: AnyDB,
  rows: TicketRow[],
): Promise<{ employeeMap: Map<string, EmployeeRow>; companyMap: Map<string, CompanyRow> }> {
  if (rows.length === 0) return { employeeMap: new Map(), companyMap: new Map() };

  const employeeIds = [
    ...new Set([
      ...rows.map((t) => t.reportedById),
      ...rows.filter((t) => t.assigneeId).map((t) => t.assigneeId!),
    ]),
  ];
  const companyIds = [...new Set(rows.map((t) => t.companyId))];

  const [empRows, compRows] = await Promise.all([
    db
      .select({ id: employees.id, fullName: employees.fullName, email: employees.email })
      .from(employees)
      .where(inArray(employees.id, employeeIds)),
    db
      .select({ id: companies.id, slug: companies.slug, name: companies.name })
      .from(companies)
      .where(inArray(companies.id, companyIds)),
  ]);

  return {
    employeeMap: new Map(empRows.map((e) => [e.id, e])),
    companyMap: new Map(compRows.map((c) => [c.id, c])),
  };
}

function toTicketWithRelations(
  row: TicketRow,
  employeeMap: Map<string, EmployeeRow>,
  companyMap: Map<string, CompanyRow>,
): TicketWithRelations | null {
  const reportedBy = employeeMap.get(row.reportedById);
  const company = companyMap.get(row.companyId);
  if (reportedBy === undefined || company === undefined) return null;
  return {
    id: row.id,
    ticketNumber: row.ticketNumber,
    title: row.title,
    description: row.description,
    status: row.status,
    priority: row.priority,
    category: row.category,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    closedAt: row.closedAt,
    assignee: row.assigneeId ? (employeeMap.get(row.assigneeId) ?? null) : null,
    reportedBy,
    company,
  };
}

export async function listTickets(db: AnyDB): Promise<TicketWithRelations[]> {
  const rows = await db.select().from(tickets).where(isNull(tickets.closedAt));
  const { employeeMap, companyMap } = await fetchRelations(db, rows);
  return rows
    .map((r) => toTicketWithRelations(r, employeeMap, companyMap))
    .filter((t): t is TicketWithRelations => t !== null);
}

export async function getTicketById(db: AnyDB, id: string): Promise<TicketWithRelations | null> {
  const rows = await db.select().from(tickets).where(eq(tickets.id, id)).limit(1);
  const row = rows[0];
  if (!row) return null;
  const { employeeMap, companyMap } = await fetchRelations(db, [row]);
  return toTicketWithRelations(row, employeeMap, companyMap);
}

export async function getTicketByTicketNumber(
  db: AnyDB,
  ticketNumber: string,
): Promise<TicketWithRelations | null> {
  const normalized = ticketNumber.toUpperCase();
  const rows = await db.select().from(tickets).where(eq(tickets.ticketNumber, normalized)).limit(1);
  const row = rows[0];
  if (!row) return null;
  const { employeeMap, companyMap } = await fetchRelations(db, [row]);
  return toTicketWithRelations(row, employeeMap, companyMap);
}

export type CreateTicketInput = {
  id: string;
  ticketNumber: string;
  title: string;
  description?: string;
  companyId: string;
  reportedById: string;
  assigneeId?: string;
  priority?: "LOW" | "MEDIUM" | "HIGH";
  category?: "IT" | "FACILITIES" | "MISCELLANEOUS";
};

export async function createTicket(
  db: AnyDB,
  input: CreateTicketInput,
): Promise<typeof tickets.$inferSelect> {
  const now = new Date().toISOString();
  const [row] = await db
    .insert(tickets)
    .values({
      id: input.id,
      ticketNumber: input.ticketNumber,
      title: input.title,
      description: input.description ?? null,
      status: "NEW",
      priority: input.priority ?? "MEDIUM",
      category: input.category ?? null,
      assigneeId: input.assigneeId ?? null,
      reportedById: input.reportedById,
      companyId: input.companyId,
      createdAt: now,
      updatedAt: now,
      closedAt: null,
    })
    .returning();

  return row!;
}

export type UpdateTicketInput = {
  title?: string;
  description?: string;
  status?: "NEW" | "PENDING" | "RESOLVED" | "CANCELLED" | "CLOSED";
  priority?: "LOW" | "MEDIUM" | "HIGH";
  category?: "IT" | "FACILITIES" | "MISCELLANEOUS";
  assigneeId?: string | null;
};

export async function updateTicket(
  db: AnyDB,
  id: string,
  input: UpdateTicketInput,
): Promise<typeof tickets.$inferSelect | null> {
  const now = new Date().toISOString();
  const values: Record<string, unknown> = { updatedAt: now };
  if (input.title !== undefined) values.title = input.title;
  if (input.description !== undefined) values.description = input.description;
  if (input.status !== undefined) values.status = input.status;
  if (input.priority !== undefined) values.priority = input.priority;
  if (input.category !== undefined) values.category = input.category;
  if (input.assigneeId !== undefined) values.assigneeId = input.assigneeId ?? null;

  const [row] = await db
    .update(tickets)
    .set(values as Record<string, string | null>)
    .where(eq(tickets.id, id))
    .returning();

  return row ?? null;
}

export type TicketHistoryFilters = {
  employeeId: string;
  status?: "NEW" | "PENDING" | "RESOLVED" | "CANCELLED" | "CLOSED";
  category?: "IT" | "FACILITIES" | "MISCELLANEOUS";
  priority?: "LOW" | "MEDIUM" | "HIGH";
  dateFrom?: string;
  dateTo?: string;
};

export async function getTicketHistory(
  db: AnyDB,
  filters: TicketHistoryFilters,
): Promise<TicketWithRelations[]> {
  const conditions = [eq(tickets.reportedById, filters.employeeId)];
  if (filters.status !== undefined) conditions.push(eq(tickets.status, filters.status));
  if (filters.category !== undefined) conditions.push(eq(tickets.category, filters.category));
  if (filters.priority !== undefined) conditions.push(eq(tickets.priority, filters.priority));
  if (filters.dateFrom !== undefined) conditions.push(gte(tickets.createdAt, filters.dateFrom));
  if (filters.dateTo !== undefined) conditions.push(lte(tickets.createdAt, filters.dateTo));

  const rows = await db
    .select()
    .from(tickets)
    .where(and(...conditions));
  const { employeeMap, companyMap } = await fetchRelations(db, rows);
  return rows
    .map((r) => toTicketWithRelations(r, employeeMap, companyMap))
    .filter((t): t is TicketWithRelations => t !== null);
}

export async function closeTicket(db: AnyDB, id: string): Promise<boolean> {
  const now = new Date().toISOString();
  const [row] = await db
    .update(tickets)
    .set({ closedAt: now, updatedAt: now })
    .where(eq(tickets.id, id))
    .returning();

  return row !== undefined;
}

export async function countTicketsByCompany(db: AnyDB, companyId: string): Promise<number> {
  const [r] = await db.select({ n: count() }).from(tickets).where(eq(tickets.companyId, companyId));
  return r?.n ?? 0;
}

export async function getCompanyById(
  db: AnyDB,
  id: string,
): Promise<{ id: string; slug: string } | null> {
  const [r] = await db
    .select({ id: companies.id, slug: companies.slug })
    .from(companies)
    .where(and(eq(companies.id, id), isNull(companies.deletedAt)))
    .limit(1);
  return r ?? null;
}

export async function getEmployeeById(db: AnyDB, id: string): Promise<{ id: string } | null> {
  const [r] = await db
    .select({ id: employees.id })
    .from(employees)
    .where(and(eq(employees.id, id), isNull(employees.deletedAt)))
    .limit(1);
  return r ?? null;
}
