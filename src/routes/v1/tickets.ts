import { Elysia, t } from "elysia";
import { v7 as uuidv7 } from "uuid";
import { drizzle } from "drizzle-orm/d1";
import { env } from "cloudflare:workers";
import * as schema from "../../db/schema";
import {
  listTickets,
  getTicketById,
  createTicket,
  updateTicket,
  closeTicket,
  countTicketsByCompany,
  getCompanyById,
  getEmployeeById,
} from "../../db/tickets";

const createTicketBody = t.Object({
  title: t.String({ minLength: 1 }),
  companyId: t.String({ format: "uuid" }),
  reportedById: t.String({ format: "uuid" }),
  description: t.Optional(t.String()),
  priority: t.Optional(
    t.Union([t.Literal("LOW"), t.Literal("MEDIUM"), t.Literal("HIGH")])
  ),
  category: t.Optional(
    t.Union([
      t.Literal("IT"),
      t.Literal("FACILITIES"),
      t.Literal("MISCELLANEOUS"),
    ])
  ),
  assigneeId: t.Optional(t.String({ format: "uuid" })),
});

const updateTicketBody = t.Object({
  description: t.Optional(t.String()),
  priority: t.Optional(
    t.Union([t.Literal("LOW"), t.Literal("MEDIUM"), t.Literal("HIGH")])
  ),
});

export const ticketsRouter = new Elysia({ prefix: "/v1/tickets" })
  .get(
    "/",
    async () => {
      const db = drizzle(env.DB, { schema });
      const tickets = await listTickets(db);
      return tickets;
    },
    {
      detail: {
        summary: "List open tickets",
        tags: ["tickets"],
      },
    }
  )
  .post(
    "/",
    async ({ body }) => {
      const db = drizzle(env.DB, { schema });
      const company = await getCompanyById(db, body.companyId);
      if (!company) {
        return new Response(
          JSON.stringify({ error: "Not Found", message: "Company not found" }),
          { status: 404, headers: { "Content-Type": "application/json" } }
        );
      }
      const reporter = await getEmployeeById(db, body.reportedById);
      if (!reporter) {
        return new Response(
          JSON.stringify({
            error: "Not Found",
            message: "Reporter employee not found",
          }),
          { status: 404, headers: { "Content-Type": "application/json" } }
        );
      }
      if (body.assigneeId) {
        const assignee = await getEmployeeById(db, body.assigneeId);
        if (!assignee) {
          return new Response(
            JSON.stringify({
              error: "Not Found",
              message: "Assignee employee not found",
            }),
            { status: 404, headers: { "Content-Type": "application/json" } }
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
        assigneeId: body.assigneeId,
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
    }
  )
  .get(
    "/:id",
    async ({ params }) => {
      const db = drizzle(env.DB, { schema });
      const ticket = await getTicketById(db, params.id);
      if (!ticket) {
        return new Response(
          JSON.stringify({
            error: "Not Found",
            message: "Ticket not found",
          }),
          { status: 404, headers: { "Content-Type": "application/json" } }
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
    }
  )
  .put(
    "/:id",
    async ({ params, body }) => {
      const db = drizzle(env.DB, { schema });
      const existing = await getTicketById(db, params.id);
      if (!existing) {
        return new Response(
          JSON.stringify({
            error: "Not Found",
            message: "Ticket not found",
          }),
          { status: 404, headers: { "Content-Type": "application/json" } }
        );
      }
      const updated = await updateTicket(db, params.id, {
        description: body.description,
        priority: body.priority,
      });
      if (!updated) return existing;
      return getTicketById(db, params.id);
    },
    {
      params: t.Object({ id: t.String({ format: "uuid" }) }),
      body: updateTicketBody,
      detail: {
        summary: "Update ticket (description, priority only)",
        tags: ["tickets"],
      },
    }
  )
  .delete(
    "/:id",
    async ({ params }) => {
      const db = drizzle(env.DB, { schema });
      await closeTicket(db, params.id);
      return new Response(null, { status: 204 });
    },
    {
      params: t.Object({ id: t.String({ format: "uuid" }) }),
      detail: {
        summary: "Close ticket (idempotent)",
        tags: ["tickets"],
      },
    }
  );
