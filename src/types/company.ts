import { t } from "elysia";
import type { companies } from "../db/schema.postgres";

export type CompanyEntity = typeof companies.$inferSelect;

export type CompanyDTO = Omit<CompanyEntity, "deletedAt">;

export function toCompanyDTO(entity: CompanyEntity): CompanyDTO {
  const { deletedAt: _, ...dto } = entity;
  return dto;
}

export const companyDTOSchema = t.Object({
  id: t.String({ format: "uuid" }),
  slug: t.String(),
  name: t.String(),
  description: t.Nullable(t.String()),
  createdAt: t.String({ format: "date-time" }),
  updatedAt: t.String({ format: "date-time" }),
});
