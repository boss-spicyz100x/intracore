import { pgTable, text, uniqueIndex } from "drizzle-orm/pg-core";

export const companies = pgTable("companies", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
  deletedAt: text("deleted_at"),
});

export const employees = pgTable(
  "employees",
  {
    id: text("id").primaryKey(),
    employeeNumber: text("employee_number").notNull(),
    fullName: text("full_name").notNull(),
    email: text("email").notNull().unique(),
    phoneNumber: text("phone_number").notNull(),
    department: text("department"),
    role: text("role"),
    preferredLanguage: text("preferred_language").notNull().default("en-US"),
    companyId: text("company_id")
      .notNull()
      .references(() => companies.id),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
    deletedAt: text("deleted_at"),
  },
  (table) => ({
    companyEmployeeNumIdx: uniqueIndex("company_employee_num_idx").on(
      table.companyId,
      table.employeeNumber,
    ),
  }),
);

export const tickets = pgTable("tickets", {
  id: text("id").primaryKey(),
  ticketNumber: text("ticket_number").notNull().unique(),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status", {
    enum: ["NEW", "PENDING", "RESOLVED", "CANCELLED", "CLOSED"],
  })
    .notNull()
    .default("NEW"),
  priority: text("priority", { enum: ["LOW", "MEDIUM", "HIGH"] })
    .notNull()
    .default("MEDIUM"),
  category: text("category", {
    enum: ["IT", "FACILITIES", "MISCELLANEOUS"],
  }),
  assigneeId: text("assignee_id").references(() => employees.id),
  reportedById: text("reported_by_id")
    .notNull()
    .references(() => employees.id),
  companyId: text("company_id")
    .notNull()
    .references(() => companies.id),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
  closedAt: text("closed_at"),
});
