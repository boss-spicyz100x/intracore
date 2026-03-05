import { eq, isNull, and, ne } from "drizzle-orm";
import { employees } from "./schema.postgres";
import type { AnyDB } from "./tickets";
import type { EmployeeEntity } from "../types/employee";

export async function listEmployees(db: AnyDB, companyId?: string): Promise<EmployeeEntity[]> {
  const conditions = companyId
    ? and(eq(employees.companyId, companyId), isNull(employees.deletedAt))
    : isNull(employees.deletedAt);
  const rows = await db.select().from(employees).where(conditions);
  return rows;
}

export async function getEmployeeById(db: AnyDB, id: string): Promise<EmployeeEntity | null> {
  const [r] = await db
    .select()
    .from(employees)
    .where(and(eq(employees.id, id), isNull(employees.deletedAt)))
    .limit(1);
  return r ?? null;
}

export async function getEmployeeByEmail(
  db: AnyDB,
  email: string,
  excludeId?: string,
): Promise<EmployeeEntity | null> {
  const conditions = excludeId
    ? and(eq(employees.email, email), ne(employees.id, excludeId), isNull(employees.deletedAt))
    : and(eq(employees.email, email), isNull(employees.deletedAt));
  const [r] = await db.select().from(employees).where(conditions).limit(1);
  return r ?? null;
}

export type CreateEmployeeInput = {
  id: string;
  employeeNumber: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  companyId: string;
  department?: string;
  role?: string;
  preferredLanguage?: string;
};

export async function createEmployee(
  db: AnyDB,
  input: CreateEmployeeInput,
): Promise<EmployeeEntity> {
  const now = new Date().toISOString();
  const [row] = await db
    .insert(employees)
    .values({
      id: input.id,
      employeeNumber: input.employeeNumber,
      fullName: input.fullName,
      email: input.email,
      phoneNumber: input.phoneNumber,
      department: input.department ?? null,
      role: input.role ?? null,
      preferredLanguage: input.preferredLanguage ?? "en-US",
      companyId: input.companyId,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    })
    .returning();
  return row!;
}

export type UpdateEmployeeInput = {
  fullName?: string;
  email?: string;
  phoneNumber?: string;
  department?: string;
  role?: string;
  preferredLanguage?: string;
};

export async function updateEmployee(
  db: AnyDB,
  id: string,
  input: UpdateEmployeeInput,
): Promise<EmployeeEntity | null> {
  const now = new Date().toISOString();
  const values: Record<string, unknown> = { updatedAt: now };
  if (input.fullName !== undefined) values.fullName = input.fullName;
  if (input.email !== undefined) values.email = input.email;
  if (input.phoneNumber !== undefined) values.phoneNumber = input.phoneNumber;
  if (input.department !== undefined) values.department = input.department;
  if (input.role !== undefined) values.role = input.role;
  if (input.preferredLanguage !== undefined) values.preferredLanguage = input.preferredLanguage;

  const [row] = await db
    .update(employees)
    .set(values as Record<string, string | null>)
    .where(and(eq(employees.id, id), isNull(employees.deletedAt)))
    .returning();

  return row ?? null;
}

export async function softDeleteEmployee(db: AnyDB, id: string): Promise<void> {
  const now = new Date().toISOString();
  await db.update(employees).set({ deletedAt: now, updatedAt: now }).where(eq(employees.id, id));
}
