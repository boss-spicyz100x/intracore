import { Elysia, t, status as error } from "elysia";
import { v7 as uuidv7 } from "uuid";
import type { AnyDB } from "../../db/tickets";
import {
  listTickets,
  getTicketById,
  getTicketByTicketNumber,
  createTicket,
  updateTicket,
  closeTicket,
  countTicketsByCompany,
  getCompanyById,
  getEmployeeById,
  getTicketHistory,
} from "../../db/tickets";

const CATEGORIES = ["IT", "FACILITIES", "MISCELLANEOUS"] as const;
const PRIORITIES = ["LOW", "MEDIUM", "HIGH"] as const;
const STATUSES = ["NEW", "PENDING", "RESOLVED", "CANCELLED", "CLOSED"] as const;

function normalizeEnum<T extends string>(
  value: string | undefined,
  allowed: readonly T[],
  name: string,
): T | undefined {
  if (value === undefined || value === null) return undefined;
  const norm = value.toUpperCase();
  if (allowed.includes(norm as T)) return norm as T;
  throw error(400, {
    error: "Bad Request",
    message: `Invalid ${name}: must be one of ${allowed.join(", ")}`,
  });
}

const createTicketBody = t.Object({
  title: t.String({ minLength: 1 }),
  companyId: t.String({ format: "uuid" }),
  reportedById: t.String({ format: "uuid" }),
  description: t.Optional(t.String()),
  priority: t.Optional(t.String()),
  category: t.Optional(t.String()),
  assigneeId: t.Optional(t.Union([t.String({ format: "uuid" }), t.Null()])),
});

const updateTicketBody = t.Object({
  title: t.Optional(t.String({ minLength: 1 })),
  description: t.Optional(t.String()),
  status: t.Optional(t.String()),
  priority: t.Optional(t.String()),
  category: t.Optional(t.String()),
  assigneeId: t.Optional(t.Union([t.String({ format: "uuid" }), t.Null()])),
});

export function ticketsRouter(db: AnyDB) {
  return new Elysia({ prefix: "/v1/tickets" })
    .get(
      "/",
      async () => {
        const tickets = await listTickets(db);
        return tickets;
      },
      {
        detail: {
          summary: "List open tickets",
          tags: ["tickets"],
        },
      },
    )
    .get(
      "/history",
      async ({ query }) => {
        if (!query.employeeId) {
          throw error(400, {
            error: "Bad Request",
            message: "employeeId is required",
          });
        }
        const tickets = await getTicketHistory(db, {
          employeeId: query.employeeId,
          status: normalizeEnum(query.status, STATUSES, "status"),
          category: normalizeEnum(query.category, CATEGORIES, "category"),
          priority: normalizeEnum(query.priority, PRIORITIES, "priority"),
          dateFrom: query.dateFrom,
          dateTo: query.dateTo,
        });
        return tickets;
      },
      {
        query: t.Object({
          employeeId: t.Optional(t.String({ format: "uuid" })),
          status: t.Optional(t.String()),
          category: t.Optional(t.String()),
          priority: t.Optional(t.String()),
          dateFrom: t.Optional(t.String()),
          dateTo: t.Optional(t.String()),
        }),
        detail: {
          summary: "Get ticket history for employee",
          tags: ["tickets"],
        },
      },
    )
    .post(
      "/",
      async ({ body }) => {
        const company = await getCompanyById(db, body.companyId);
        if (!company) {
          throw error(404, { error: "Not Found", message: "Company not found" });
        }
        const reporter = await getEmployeeById(db, body.reportedById);
        if (!reporter) {
          throw error(404, {
            error: "Not Found",
            message: "Reporter employee not found",
          });
        }
        const assigneeId = body.assigneeId || undefined;
        if (assigneeId) {
          const assignee = await getEmployeeById(db, assigneeId);
          if (!assignee) {
            throw error(404, {
              error: "Not Found",
              message: "Assignee employee not found",
            });
          }
        }
        const count = await countTicketsByCompany(db, body.companyId);
        const seq = count + 1;
        const ticketNumber = `${company.slug}-${String(seq).padStart(5, "0")}`;
        const id = uuidv7();
        const ticket = await createTicket(db, {
          id,
          ticketNumber,
          title: body.title,
          description: body.description,
          companyId: body.companyId,
          reportedById: body.reportedById,
          assigneeId,
          priority: normalizeEnum(body.priority, PRIORITIES, "priority"),
          category: normalizeEnum(body.category, CATEGORIES, "category"),
        });
        const full = await getTicketById(db, ticket.id);
        return full;
      },
      {
        body: createTicketBody,
        detail: {
          summary: "Create ticket",
          tags: ["tickets"],
        },
      },
    )
    .get(
      "/number/:ticketNumber",
      async ({ params }) => {
        const ticket = await getTicketByTicketNumber(db, params.ticketNumber);
        if (!ticket) {
          throw error(404, {
            error: "Not Found",
            message: "Ticket not found",
          });
        }
        return ticket;
      },
      {
        params: t.Object({
          ticketNumber: t.String({ pattern: "^[A-Za-z0-9]+-\\d+$" }),
        }),
        detail: {
          summary: "Get ticket by ticket number",
          tags: ["tickets"],
        },
      },
    )
    .put(
      "/number/:ticketNumber",
      async ({ params, body }) => {
        const existing = await getTicketByTicketNumber(db, params.ticketNumber);
        if (!existing) {
          throw error(404, {
            error: "Not Found",
            message: "Ticket not found",
          });
        }
        if (body.assigneeId !== undefined && body.assigneeId !== null) {
          const assignee = await getEmployeeById(db, body.assigneeId);
          if (!assignee) {
            throw error(404, {
              error: "Not Found",
              message: "Assignee employee not found",
            });
          }
        }
        const updated = await updateTicket(db, existing.id, {
          title: body.title,
          description: body.description,
          status: normalizeEnum(body.status, STATUSES, "status"),
          priority: normalizeEnum(body.priority, PRIORITIES, "priority"),
          category: normalizeEnum(body.category, CATEGORIES, "category"),
          assigneeId: body.assigneeId,
        });
        if (!updated) return existing;
        return getTicketById(db, existing.id);
      },
      {
        params: t.Object({
          ticketNumber: t.String({ pattern: "^[A-Za-z0-9]+-\\d+$" }),
        }),
        body: updateTicketBody,
        detail: {
          summary: "Update ticket by ticket number",
          tags: ["tickets"],
        },
      },
    )
    .delete(
      "/number/:ticketNumber",
      async ({ params }) => {
        const existing = await getTicketByTicketNumber(db, params.ticketNumber);
        if (!existing) {
          throw error(404, {
            error: "Not Found",
            message: "Ticket not found",
          });
        }
        await closeTicket(db, existing.id);
        return new Response(null, { status: 204 });
      },
      {
        params: t.Object({
          ticketNumber: t.String({ pattern: "^[A-Za-z0-9]+-\\d+$" }),
        }),
        detail: {
          summary: "Close ticket by ticket number (idempotent)",
          tags: ["tickets"],
        },
      },
    )
    .get(
      "/:id",
      async ({ params }) => {
        const ticket = await getTicketById(db, params.id);
        if (!ticket) {
          throw error(404, {
            error: "Not Found",
            message: "Ticket not found",
          });
        }
        return ticket;
      },
      {
        params: t.Object({ id: t.String({ format: "uuid" }) }),
        detail: {
          summary: "Get ticket by ID",
          tags: ["tickets"],
        },
      },
    )
    .put(
      "/:id",
      async ({ params, body }) => {
        const existing = await getTicketById(db, params.id);
        if (!existing) {
          throw error(404, {
            error: "Not Found",
            message: "Ticket not found",
          });
        }
        if (body.assigneeId !== undefined && body.assigneeId !== null) {
          const assignee = await getEmployeeById(db, body.assigneeId);
          if (!assignee) {
            throw error(404, {
              error: "Not Found",
              message: "Assignee employee not found",
            });
          }
        }
        const updated = await updateTicket(db, params.id, {
          title: body.title,
          description: body.description,
          status: normalizeEnum(body.status, STATUSES, "status"),
          priority: normalizeEnum(body.priority, PRIORITIES, "priority"),
          category: normalizeEnum(body.category, CATEGORIES, "category"),
          assigneeId: body.assigneeId,
        });
        if (!updated) return existing;
        return getTicketById(db, params.id);
      },
      {
        params: t.Object({ id: t.String({ format: "uuid" }) }),
        body: updateTicketBody,
        detail: {
          summary: "Update ticket",
          tags: ["tickets"],
        },
      },
    )
    .delete(
      "/:id",
      async ({ params }) => {
        await closeTicket(db, params.id);
        return new Response(null, { status: 204 });
      },
      {
        params: t.Object({ id: t.String({ format: "uuid" }) }),
        detail: {
          summary: "Close ticket (idempotent)",
          tags: ["tickets"],
        },
      },
    );
}
