import { t } from "elysia";
import type { employees } from "../db/schema.postgres";

export type EmployeeEntity = typeof employees.$inferSelect;

export type EmployeeDTO = Omit<EmployeeEntity, "deletedAt">;

export function toEmployeeDTO(entity: EmployeeEntity): EmployeeDTO {
  const { deletedAt: _, ...dto } = entity;
  return dto;
}

export const employeeDTOSchema = t.Object({
  id: t.String({ format: "uuid" }),
  employeeNumber: t.String(),
  fullName: t.String(),
  email: t.String({ format: "email" }),
  phoneNumber: t.String(),
  department: t.Nullable(t.String()),
  role: t.Nullable(t.String()),
  preferredLanguage: t.String(),
  companyId: t.String({ format: "uuid" }),
  createdAt: t.String({ format: "date-time" }),
  updatedAt: t.String({ format: "date-time" }),
});
