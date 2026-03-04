import { eq, isNull, count, and, gte, lte } from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core";
import type { BaseSQLiteDatabase } from "drizzle-orm/sqlite-core";
import { companies, employees, tickets } from "./schema.sqlite";

const assignee = alias(employees, "assignee");
const reportedBy = alias(employees, "reported_by");

export type AnyDB = BaseSQLiteDatabase<"sync" | "async", any, any>;

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

export async function listTickets(db: AnyDB): Promise<TicketWithRelations[]> {
  const rows = await db
    .select({
      id: tickets.id,
      ticketNumber: tickets.ticketNumber,
      title: tickets.title,
      description: tickets.description,
      status: tickets.status,
      priority: tickets.priority,
      category: tickets.category,
      createdAt: tickets.createdAt,
      updatedAt: tickets.updatedAt,
      closedAt: tickets.closedAt,
      assigneeId: assignee.id,
      assigneeFullName: assignee.fullName,
      assigneeEmail: assignee.email,
      reportedById: reportedBy.id,
      reportedByFullName: reportedBy.fullName,
      reportedByEmail: reportedBy.email,
      companyId: companies.id,
      companySlug: companies.slug,
      companyName: companies.name,
    })
    .from(tickets)
    .leftJoin(assignee, eq(tickets.assigneeId, assignee.id))
    .innerJoin(reportedBy, eq(tickets.reportedById, reportedBy.id))
    .innerJoin(companies, eq(tickets.companyId, companies.id))
    .where(isNull(tickets.closedAt));

  return rows.map((r) => ({
    id: r.id,
    ticketNumber: r.ticketNumber,
    title: r.title,
    description: r.description,
    status: r.status,
    priority: r.priority,
    category: r.category,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    closedAt: r.closedAt,
    assignee: r.assigneeId
      ? {
          id: r.assigneeId,
          fullName: r.assigneeFullName!,
          email: r.assigneeEmail!,
        }
      : null,
    reportedBy: {
      id: r.reportedById!,
      fullName: r.reportedByFullName!,
      email: r.reportedByEmail!,
    },
    company: {
      id: r.companyId!,
      slug: r.companySlug!,
      name: r.companyName!,
    },
  }));
}

export async function getTicketById(db: AnyDB, id: string): Promise<TicketWithRelations | null> {
  const rows = await db
    .select({
      id: tickets.id,
      ticketNumber: tickets.ticketNumber,
      title: tickets.title,
      description: tickets.description,
      status: tickets.status,
      priority: tickets.priority,
      category: tickets.category,
      createdAt: tickets.createdAt,
      updatedAt: tickets.updatedAt,
      closedAt: tickets.closedAt,
      assigneeId: assignee.id,
      assigneeFullName: assignee.fullName,
      assigneeEmail: assignee.email,
      reportedById: reportedBy.id,
      reportedByFullName: reportedBy.fullName,
      reportedByEmail: reportedBy.email,
      companyId: companies.id,
      companySlug: companies.slug,
      companyName: companies.name,
    })
    .from(tickets)
    .leftJoin(assignee, eq(tickets.assigneeId, assignee.id))
    .innerJoin(reportedBy, eq(tickets.reportedById, reportedBy.id))
    .innerJoin(companies, eq(tickets.companyId, companies.id))
    .where(eq(tickets.id, id))
    .limit(1);

  const r = rows[0];
  if (!r) return null;

  return {
    id: r.id,
    ticketNumber: r.ticketNumber,
    title: r.title,
    description: r.description,
    status: r.status,
    priority: r.priority,
    category: r.category,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    closedAt: r.closedAt,
    assignee: r.assigneeId
      ? {
          id: r.assigneeId,
          fullName: r.assigneeFullName!,
          email: r.assigneeEmail!,
        }
      : null,
    reportedBy: {
      id: r.reportedById!,
      fullName: r.reportedByFullName!,
      email: r.reportedByEmail!,
    },
    company: {
      id: r.companyId!,
      slug: r.companySlug!,
      name: r.companyName!,
    },
  };
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
    .select({
      id: tickets.id,
      ticketNumber: tickets.ticketNumber,
      title: tickets.title,
      description: tickets.description,
      status: tickets.status,
      priority: tickets.priority,
      category: tickets.category,
      createdAt: tickets.createdAt,
      updatedAt: tickets.updatedAt,
      closedAt: tickets.closedAt,
      assigneeId: assignee.id,
      assigneeFullName: assignee.fullName,
      assigneeEmail: assignee.email,
      reportedById: reportedBy.id,
      reportedByFullName: reportedBy.fullName,
      reportedByEmail: reportedBy.email,
      companyId: companies.id,
      companySlug: companies.slug,
      companyName: companies.name,
    })
    .from(tickets)
    .leftJoin(assignee, eq(tickets.assigneeId, assignee.id))
    .innerJoin(reportedBy, eq(tickets.reportedById, reportedBy.id))
    .innerJoin(companies, eq(tickets.companyId, companies.id))
    .where(and(...conditions));

  return rows.map((r) => ({
    id: r.id,
    ticketNumber: r.ticketNumber,
    title: r.title,
    description: r.description,
    status: r.status,
    priority: r.priority,
    category: r.category,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    closedAt: r.closedAt,
    assignee: r.assigneeId
      ? {
          id: r.assigneeId,
          fullName: r.assigneeFullName!,
          email: r.assigneeEmail!,
        }
      : null,
    reportedBy: {
      id: r.reportedById!,
      fullName: r.reportedByFullName!,
      email: r.reportedByEmail!,
    },
    company: {
      id: r.companyId!,
      slug: r.companySlug!,
      name: r.companyName!,
    },
  }));
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
