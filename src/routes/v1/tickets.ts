import { Elysia, t } from "elysia";
import { v7 as uuidv7 } from "uuid";
import type { AnyDB } from "../../db/tickets";
import {
  listTickets,
  getTicketById,
  createTicket,
  updateTicket,
  closeTicket,
  countTicketsByCompany,
  getCompanyById,
  getEmployeeById,
  getTicketHistory,
} from "../../db/tickets";

const createTicketBody = t.Object({
  title: t.String({ minLength: 1 }),
  companyId: t.String({ format: "uuid" }),
  reportedById: t.String({ format: "uuid" }),
  description: t.Optional(t.String()),
  priority: t.Optional(t.Union([t.Literal("LOW"), t.Literal("MEDIUM"), t.Literal("HIGH")])),
  category: t.Optional(
    t.Union([t.Literal("IT"), t.Literal("FACILITIES"), t.Literal("MISCELLANEOUS")]),
  ),
  assigneeId: t.Optional(t.Union([t.String({ format: "uuid" }), t.Null()])),
});

const updateTicketBody = t.Object({
  title: t.Optional(t.String({ minLength: 1 })),
  description: t.Optional(t.String()),
  status: t.Optional(
    t.Union([
      t.Literal("NEW"),
      t.Literal("PENDING"),
      t.Literal("RESOLVED"),
      t.Literal("CANCELLED"),
      t.Literal("CLOSED"),
    ]),
  ),
  priority: t.Optional(t.Union([t.Literal("LOW"), t.Literal("MEDIUM"), t.Literal("HIGH")])),
  category: t.Optional(
    t.Union([t.Literal("IT"), t.Literal("FACILITIES"), t.Literal("MISCELLANEOUS")]),
  ),
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
          return new Response(
            JSON.stringify({
              error: "Bad Request",
              message: "employeeId is required",
            }),
            { status: 400, headers: { "Content-Type": "application/json" } },
          );
        }
        const tickets = await getTicketHistory(db, {
          employeeId: query.employeeId,
          status: query.status,
          category: query.category,
          priority: query.priority,
          dateFrom: query.dateFrom,
          dateTo: query.dateTo,
        });
        return tickets;
      },
      {
        query: t.Object({
          employeeId: t.Optional(t.String({ format: "uuid" })),
          status: t.Optional(
            t.Union([
              t.Literal("NEW"),
              t.Literal("PENDING"),
              t.Literal("RESOLVED"),
              t.Literal("CANCELLED"),
              t.Literal("CLOSED"),
            ]),
          ),
          category: t.Optional(
            t.Union([t.Literal("IT"), t.Literal("FACILITIES"), t.Literal("MISCELLANEOUS")]),
          ),
          priority: t.Optional(t.Union([t.Literal("LOW"), t.Literal("MEDIUM"), t.Literal("HIGH")])),
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
          return new Response(
            JSON.stringify({ error: "Not Found", message: "Company not found" }),
            { status: 404, headers: { "Content-Type": "application/json" } },
          );
        }
        const reporter = await getEmployeeById(db, body.reportedById);
        if (!reporter) {
          return new Response(
            JSON.stringify({
              error: "Not Found",
              message: "Reporter employee not found",
            }),
            { status: 404, headers: { "Content-Type": "application/json" } },
          );
        }
        const assigneeId = body.assigneeId || undefined;
        if (assigneeId) {
          const assignee = await getEmployeeById(db, assigneeId);
          if (!assignee) {
            return new Response(
              JSON.stringify({
                error: "Not Found",
                message: "Assignee employee not found",
              }),
              { status: 404, headers: { "Content-Type": "application/json" } },
            );
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
          priority: body.priority,
          category: body.category,
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
      "/:id",
      async ({ params }) => {
        const ticket = await getTicketById(db, params.id);
        if (!ticket) {
          return new Response(
            JSON.stringify({
              error: "Not Found",
              message: "Ticket not found",
            }),
            { status: 404, headers: { "Content-Type": "application/json" } },
          );
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
          return new Response(
            JSON.stringify({
              error: "Not Found",
              message: "Ticket not found",
            }),
            { status: 404, headers: { "Content-Type": "application/json" } },
          );
        }
        if (body.assigneeId !== undefined && body.assigneeId !== null) {
          const assignee = await getEmployeeById(db, body.assigneeId);
          if (!assignee) {
            return new Response(
              JSON.stringify({
                error: "Not Found",
                message: "Assignee employee not found",
              }),
              { status: 404, headers: { "Content-Type": "application/json" } },
            );
          }
        }
        const updated = await updateTicket(db, params.id, {
          title: body.title,
          description: body.description,
          status: body.status,
          priority: body.priority,
          category: body.category,
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
