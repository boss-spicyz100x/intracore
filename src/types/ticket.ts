import { t } from "elysia";

export type TicketStatus = "NEW" | "PENDING" | "RESOLVED" | "CANCELLED" | "CLOSED";
export type TicketPriority = "LOW" | "MEDIUM" | "HIGH";
export type TicketCategory = "IT" | "FACILITIES" | "MISCELLANEOUS";

export type TicketEntity = {
  id: string;
  ticketNumber: string;
  title: string;
  description: string | null;
  status: TicketStatus;
  priority: TicketPriority;
  category: TicketCategory | null;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
  assignee: { id: string; fullName: string; email: string } | null;
  reportedBy: { id: string; fullName: string; email: string };
  company: { id: string; slug: string; name: string };
};

export type TicketDTO = TicketEntity;

export function toTicketDTO(entity: TicketEntity): TicketDTO {
  return entity;
}

const ticketPersonSchema = t.Object({
  id: t.String({ format: "uuid" }),
  fullName: t.String(),
  email: t.String({ format: "email" }),
});

export const ticketDTOSchema = t.Object({
  id: t.String({ format: "uuid" }),
  ticketNumber: t.String(),
  title: t.String(),
  description: t.Nullable(t.String()),
  status: t.Union([
    t.Literal("NEW"),
    t.Literal("PENDING"),
    t.Literal("RESOLVED"),
    t.Literal("CANCELLED"),
    t.Literal("CLOSED"),
  ]),
  priority: t.Union([t.Literal("LOW"), t.Literal("MEDIUM"), t.Literal("HIGH")]),
  category: t.Nullable(
    t.Union([t.Literal("IT"), t.Literal("FACILITIES"), t.Literal("MISCELLANEOUS")]),
  ),
  createdAt: t.String({ format: "date-time" }),
  updatedAt: t.String({ format: "date-time" }),
  closedAt: t.Nullable(t.String({ format: "date-time" })),
  assignee: t.Nullable(ticketPersonSchema),
  reportedBy: ticketPersonSchema,
  company: t.Object({
    id: t.String({ format: "uuid" }),
    slug: t.String(),
    name: t.String(),
  }),
});
