import { eq, isNull, and, ne } from "drizzle-orm";
import { companies } from "./schema.postgres";
import type { AnyDB } from "./tickets";

export type Company = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export async function listCompanies(db: AnyDB): Promise<Company[]> {
  const rows = await db.select().from(companies).where(isNull(companies.deletedAt));
  return rows;
}

export async function getCompanyById(db: AnyDB, id: string): Promise<Company | null> {
  const [r] = await db
    .select()
    .from(companies)
    .where(and(eq(companies.id, id), isNull(companies.deletedAt)))
    .limit(1);
  return r ?? null;
}

export async function getCompanyBySlug(
  db: AnyDB,
  slug: string,
  excludeId?: string,
): Promise<Company | null> {
  const conditions = excludeId
    ? and(eq(companies.slug, slug), ne(companies.id, excludeId), isNull(companies.deletedAt))
    : and(eq(companies.slug, slug), isNull(companies.deletedAt));
  const [r] = await db.select().from(companies).where(conditions).limit(1);
  return r ?? null;
}

export type CreateCompanyInput = {
  id: string;
  slug: string;
  name: string;
  description?: string;
};

export async function createCompany(db: AnyDB, input: CreateCompanyInput): Promise<Company> {
  const now = new Date().toISOString();
  const [row] = await db
    .insert(companies)
    .values({
      id: input.id,
      slug: input.slug,
      name: input.name,
      description: input.description ?? null,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    })
    .returning();
  return row!;
}

export type UpdateCompanyInput = {
  name?: string;
  slug?: string;
  description?: string;
};

export async function updateCompany(
  db: AnyDB,
  id: string,
  input: UpdateCompanyInput,
): Promise<Company | null> {
  const now = new Date().toISOString();
  const values: Record<string, unknown> = { updatedAt: now };
  if (input.name !== undefined) values.name = input.name;
  if (input.slug !== undefined) values.slug = input.slug;
  if (input.description !== undefined) values.description = input.description;

  const [row] = await db
    .update(companies)
    .set(values as Record<string, string | null>)
    .where(and(eq(companies.id, id), isNull(companies.deletedAt)))
    .returning();

  return row ?? null;
}

export async function softDeleteCompany(db: AnyDB, id: string): Promise<void> {
  const now = new Date().toISOString();
  await db.update(companies).set({ deletedAt: now, updatedAt: now }).where(eq(companies.id, id));
}
