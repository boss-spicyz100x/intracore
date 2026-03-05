import { Elysia, t, status as error } from "elysia";
import { errorResponseSchema, validationErrorSchema } from "../../openapi/schemas";
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
import { toTicketDTO, ticketDTOSchema } from "../../types/ticket";

const statusSchema = t.Union([
  t.Literal("NEW"),
  t.Literal("PENDING"),
  t.Literal("RESOLVED"),
  t.Literal("CANCELLED"),
  t.Literal("CLOSED"),
]);

const prioritySchema = t.Union([t.Literal("LOW"), t.Literal("MEDIUM"), t.Literal("HIGH")]);

const categorySchema = t.Union([
  t.Literal("IT"),
  t.Literal("FACILITIES"),
  t.Literal("MISCELLANEOUS"),
]);

const createTicketBody = t.Object({
  title: t.String({ minLength: 1 }),
  companyId: t.String({ format: "uuid" }),
  reportedById: t.String({ format: "uuid" }),
  category: categorySchema,
  description: t.Optional(t.String()),
  priority: t.Optional(prioritySchema),
  assigneeId: t.Optional(t.Union([t.String({ format: "uuid" }), t.Null()])),
});

const updateTicketBody = t.Object({
  title: t.Optional(t.String({ minLength: 1 })),
  description: t.Optional(t.String()),
  status: t.Optional(statusSchema),
  priority: t.Optional(prioritySchema),
  category: t.Optional(categorySchema),
  assigneeId: t.Optional(t.Union([t.String({ format: "uuid" }), t.Null()])),
});

export function ticketsRouter(db: AnyDB) {
  return new Elysia({ prefix: "/v1/tickets" })
    .onError(({ code, error: handlerError }) => {
      if (code === "VALIDATION")
        return new Response((handlerError as Error).message, {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
    })
    .get(
      "/",
      async () => {
        const tickets = await listTickets(db);
        return tickets.map(toTicketDTO);
      },
      {
        detail: {
          summary: "List open tickets",
          tags: ["tickets"],
        },
        response: { 200: t.Array(ticketDTOSchema), 400: validationErrorSchema },
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
          status: query.status,
          category: query.category,
          priority: query.priority,
          dateFrom: query.dateFrom,
          dateTo: query.dateTo,
        });
        return tickets.map(toTicketDTO);
      },
      {
        query: t.Object({
          employeeId: t.Optional(t.String({ format: "uuid" })),
          status: t.Optional(statusSchema),
          category: t.Optional(categorySchema),
          priority: t.Optional(prioritySchema),
          dateFrom: t.Optional(
            t.String({ description: "ISO date string, e.g. 2026-01-01T00:00:00.000Z" }),
          ),
          dateTo: t.Optional(
            t.String({ description: "ISO date string, e.g. 2026-12-31T23:59:59.999Z" }),
          ),
        }),
        detail: {
          summary: "Get ticket history for employee",
          tags: ["tickets"],
        },
        response: {
          200: t.Array(ticketDTOSchema),
          400: errorResponseSchema,
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
          priority: body.priority,
          category: body.category,
        });
        const full = await getTicketById(db, ticket.id);
        return toTicketDTO(full!);
      },
      {
        body: createTicketBody,
        detail: {
          summary: "Create ticket",
          tags: ["tickets"],
        },
        response: {
          200: ticketDTOSchema,
          400: errorResponseSchema,
          404: errorResponseSchema,
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
        return toTicketDTO(ticket);
      },
      {
        params: t.Object({
          ticketNumber: t.String({ pattern: "^[A-Za-z0-9]+-\\d+$" }),
        }),
        detail: {
          summary: "Get ticket by ticket number",
          tags: ["tickets"],
        },
        response: { 200: ticketDTOSchema, 400: validationErrorSchema, 404: errorResponseSchema },
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
          status: body.status,
          priority: body.priority,
          category: body.category,
          assigneeId: body.assigneeId,
        });
        if (!updated) return toTicketDTO(existing);
        const refreshed = await getTicketById(db, existing.id);
        return refreshed ? toTicketDTO(refreshed) : toTicketDTO(existing);
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
        response: {
          200: ticketDTOSchema,
          400: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
    )
    .delete(
      "/number/:ticketNumber",
      async ({ params }) => {
        const existing = await getTicketByTicketNumber(db, params.ticketNumber);
        if (!existing) {
          throw error(404, { error: "Not Found", message: "Ticket not found" });
        }
        await closeTicket(db, existing.id);
        const closed = await getTicketById(db, existing.id);
        return toTicketDTO(closed!);
      },
      {
        params: t.Object({
          ticketNumber: t.String({ pattern: "^[A-Za-z0-9]+-\\d+$" }),
        }),
        detail: {
          summary: "Close ticket by ticket number",
          tags: ["tickets"],
        },
        response: { 200: ticketDTOSchema, 400: validationErrorSchema, 404: errorResponseSchema },
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
        return toTicketDTO(ticket);
      },
      {
        params: t.Object({ id: t.String({ format: "uuid" }) }),
        detail: {
          summary: "Get ticket by ID",
          tags: ["tickets"],
        },
        response: { 200: ticketDTOSchema, 400: validationErrorSchema, 404: errorResponseSchema },
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
          status: body.status,
          priority: body.priority,
          category: body.category,
          assigneeId: body.assigneeId,
        });
        if (!updated) return toTicketDTO(existing);
        const refreshed = await getTicketById(db, params.id);
        return refreshed ? toTicketDTO(refreshed) : toTicketDTO(existing);
      },
      {
        params: t.Object({ id: t.String({ format: "uuid" }) }),
        body: updateTicketBody,
        detail: {
          summary: "Update ticket",
          tags: ["tickets"],
        },
        response: {
          200: ticketDTOSchema,
          400: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
    )
    .delete(
      "/:id",
      async ({ params }) => {
        const existing = await getTicketById(db, params.id);
        if (!existing) {
          throw error(404, { error: "Not Found", message: "Ticket not found" });
        }
        await closeTicket(db, params.id);
        const closed = await getTicketById(db, params.id);
        return toTicketDTO(closed!);
      },
      {
        params: t.Object({ id: t.String({ format: "uuid" }) }),
        detail: {
          summary: "Close ticket",
          tags: ["tickets"],
        },
        response: { 200: ticketDTOSchema, 400: validationErrorSchema, 404: errorResponseSchema },
      },
    );
}
