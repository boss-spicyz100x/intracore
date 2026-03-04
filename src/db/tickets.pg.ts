import { eq, isNull, and, gte, lte } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { companies, employees, tickets } from "./schema.postgres";

export type {
  AnyDB,
  TicketWithRelations,
  CreateTicketInput,
  UpdateTicketInput,
  TicketHistoryFilters,
} from "./tickets";

export {
  createTicket,
  updateTicket,
  closeTicket,
  countTicketsByCompany,
  getCompanyById,
  getEmployeeById,
} from "./tickets";

import type { TicketWithRelations, TicketHistoryFilters } from "./tickets";

const assignee = alias(employees, "assignee");
const reportedBy = alias(employees, "reported_by");

const selectShape = (
  t: typeof tickets,
  a: typeof assignee,
  rb: typeof reportedBy,
  c: typeof companies,
) => ({
  id: t.id,
  ticketNumber: t.ticketNumber,
  title: t.title,
  description: t.description,
  status: t.status,
  priority: t.priority,
  category: t.category,
  createdAt: t.createdAt,
  updatedAt: t.updatedAt,
  closedAt: t.closedAt,
  assigneeId: a.id,
  assigneeFullName: a.fullName,
  assigneeEmail: a.email,
  reportedById: rb.id,
  reportedByFullName: rb.fullName,
  reportedByEmail: rb.email,
  companyId: c.id,
  companySlug: c.slug,
  companyName: c.name,
});

function mapRow(r: Record<string, any>): TicketWithRelations {
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
      ? { id: r.assigneeId, fullName: r.assigneeFullName!, email: r.assigneeEmail! }
      : null,
    reportedBy: { id: r.reportedById!, fullName: r.reportedByFullName!, email: r.reportedByEmail! },
    company: { id: r.companyId!, slug: r.companySlug!, name: r.companyName! },
  };
}

export async function listTickets(db: any): Promise<TicketWithRelations[]> {
  const rows = await db
    .select(selectShape(tickets, assignee, reportedBy, companies))
    .from(tickets)
    .leftJoin(assignee, eq(tickets.assigneeId, assignee.id))
    .innerJoin(reportedBy, eq(tickets.reportedById, reportedBy.id))
    .innerJoin(companies, eq(tickets.companyId, companies.id))
    .where(isNull(tickets.closedAt));
  return rows.map(mapRow);
}

export async function getTicketById(db: any, id: string): Promise<TicketWithRelations | null> {
  const rows = await db
    .select(selectShape(tickets, assignee, reportedBy, companies))
    .from(tickets)
    .leftJoin(assignee, eq(tickets.assigneeId, assignee.id))
    .innerJoin(reportedBy, eq(tickets.reportedById, reportedBy.id))
    .innerJoin(companies, eq(tickets.companyId, companies.id))
    .where(eq(tickets.id, id))
    .limit(1);
  const r = rows[0];
  if (!r) return null;
  return mapRow(r);
}

export async function getTicketHistory(
  db: any,
  filters: TicketHistoryFilters,
): Promise<TicketWithRelations[]> {
  const conditions = [eq(tickets.reportedById, filters.employeeId)];
  if (filters.status !== undefined) conditions.push(eq(tickets.status, filters.status));
  if (filters.category !== undefined) conditions.push(eq(tickets.category, filters.category));
  if (filters.priority !== undefined) conditions.push(eq(tickets.priority, filters.priority));
  if (filters.dateFrom !== undefined) conditions.push(gte(tickets.createdAt, filters.dateFrom));
  if (filters.dateTo !== undefined) conditions.push(lte(tickets.createdAt, filters.dateTo));

  const rows = await db
    .select(selectShape(tickets, assignee, reportedBy, companies))
    .from(tickets)
    .leftJoin(assignee, eq(tickets.assigneeId, assignee.id))
    .innerJoin(reportedBy, eq(tickets.reportedById, reportedBy.id))
    .innerJoin(companies, eq(tickets.companyId, companies.id))
    .where(and(...conditions));
  return rows.map(mapRow);
}
