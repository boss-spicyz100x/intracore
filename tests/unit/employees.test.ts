import { test, expect } from "bun:test";
import { v7 as uuidv7 } from "uuid";
import { createTestDb } from "../helpers";
import {
  listEmployees,
  getEmployeeById,
  getEmployeeByEmail,
  getEmployeeByPhoneNumber,
  createEmployee,
  updateEmployee,
  softDeleteEmployee,
} from "../../src/db/employees";
import { companies, employees } from "../../src/db/schema.postgres";

async function seedCompany(db: Awaited<ReturnType<typeof createTestDb>>) {
  const now = new Date().toISOString();
  const id = uuidv7();
  await db.insert(companies).values({
    id,
    slug: "ING",
    name: "Ingfah",
    description: null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  });
  return id;
}

test("listEmployees returns empty when no employees", async () => {
  const db = await createTestDb();
  const result = await listEmployees(db);
  expect(result).toEqual([]);
});

test("listEmployees returns non-deleted employees only", async () => {
  const db = await createTestDb();
  const companyId = await seedCompany(db);
  const now = new Date().toISOString();
  const id1 = uuidv7();
  const id2 = uuidv7();
  await db.insert(employees).values([
    {
      id: id1,
      employeeNumber: "001",
      fullName: "Jane",
      email: "jane@ing.com",
      phoneNumber: "+15551111111",
      department: null,
      role: null,
      preferredLanguage: "en-US",
      companyId,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    },
    {
      id: id2,
      employeeNumber: "002",
      fullName: "John",
      email: "john@ing.com",
      phoneNumber: "+15552222222",
      department: null,
      role: null,
      preferredLanguage: "en-US",
      companyId,
      createdAt: now,
      updatedAt: now,
      deletedAt: now,
    },
  ]);
  const result = await listEmployees(db);
  expect(result).toHaveLength(1);
  expect(result[0]!.fullName).toBe("Jane");
});

test("listEmployees filters by companyId when provided", async () => {
  const db = await createTestDb();
  const now = new Date().toISOString();
  const co1 = uuidv7();
  const co2 = uuidv7();
  await db.insert(companies).values([
    {
      id: co1,
      slug: "CO1",
      name: "Co1",
      description: null,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    },
    {
      id: co2,
      slug: "CO2",
      name: "Co2",
      description: null,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    },
  ]);
  const emp1 = uuidv7();
  const emp2 = uuidv7();
  await db.insert(employees).values([
    {
      id: emp1,
      employeeNumber: "001",
      fullName: "E1",
      email: "e1@co1.com",
      phoneNumber: "+15551111111",
      department: null,
      role: null,
      preferredLanguage: "en-US",
      companyId: co1,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    },
    {
      id: emp2,
      employeeNumber: "001",
      fullName: "E2",
      email: "e2@co2.com",
      phoneNumber: "+15552222222",
      department: null,
      role: null,
      preferredLanguage: "en-US",
      companyId: co2,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    },
  ]);
  const result = await listEmployees(db, co1);
  expect(result).toHaveLength(1);
  expect(result[0]!.email).toBe("e1@co1.com");
});

test("getEmployeeById returns employee when found", async () => {
  const db = await createTestDb();
  const companyId = await seedCompany(db);
  const id = uuidv7();
  const now = new Date().toISOString();
  await db.insert(employees).values({
    id,
    employeeNumber: "001",
    fullName: "Jane",
    email: "jane@ing.com",
    phoneNumber: "+15551111111",
    department: "IT",
    role: null,
    preferredLanguage: "en-US",
    companyId,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  });
  const result = await getEmployeeById(db, id);
  expect(result).not.toBeNull();
  expect(result!.id).toBe(id);
  expect(result!.fullName).toBe("Jane");
  expect(result!.department).toBe("IT");
});

test("getEmployeeById returns null when not found", async () => {
  const db = await createTestDb();
  const result = await getEmployeeById(db, uuidv7());
  expect(result).toBeNull();
});

test("getEmployeeById returns null when soft-deleted", async () => {
  const db = await createTestDb();
  const companyId = await seedCompany(db);
  const id = uuidv7();
  const now = new Date().toISOString();
  await db.insert(employees).values({
    id,
    employeeNumber: "001",
    fullName: "Deleted",
    email: "del@ing.com",
    phoneNumber: "+15551111111",
    department: null,
    role: null,
    preferredLanguage: "en-US",
    companyId,
    createdAt: now,
    updatedAt: now,
    deletedAt: now,
  });
  const result = await getEmployeeById(db, id);
  expect(result).toBeNull();
});

test("getEmployeeByEmail returns employee when found", async () => {
  const db = await createTestDb();
  const companyId = await seedCompany(db);
  const id = uuidv7();
  const now = new Date().toISOString();
  await db.insert(employees).values({
    id,
    employeeNumber: "001",
    fullName: "Jane",
    email: "jane@ing.com",
    phoneNumber: "+15551111111",
    department: null,
    role: null,
    preferredLanguage: "en-US",
    companyId,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  });
  const result = await getEmployeeByEmail(db, "jane@ing.com");
  expect(result).not.toBeNull();
  expect(result!.email).toBe("jane@ing.com");
});

test("getEmployeeByEmail returns null when not found", async () => {
  const db = await createTestDb();
  const result = await getEmployeeByEmail(db, "none@ing.com");
  expect(result).toBeNull();
});

test("getEmployeeByEmail with excludeId excludes that employee", async () => {
  const db = await createTestDb();
  const companyId = await seedCompany(db);
  const id = uuidv7();
  const now = new Date().toISOString();
  await db.insert(employees).values({
    id,
    employeeNumber: "001",
    fullName: "Jane",
    email: "jane@ing.com",
    phoneNumber: "+15551111111",
    department: null,
    role: null,
    preferredLanguage: "en-US",
    companyId,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  });
  const withExclude = await getEmployeeByEmail(db, "jane@ing.com", id);
  expect(withExclude).toBeNull();
  const withoutExclude = await getEmployeeByEmail(db, "jane@ing.com");
  expect(withoutExclude).not.toBeNull();
  expect(withoutExclude!.id).toBe(id);
});

test("getEmployeeByPhoneNumber returns employee when found", async () => {
  const db = await createTestDb();
  const companyId = await seedCompany(db);
  const id = uuidv7();
  const now = new Date().toISOString();
  await db.insert(employees).values({
    id,
    employeeNumber: "001",
    fullName: "Jane",
    email: "jane@ing.com",
    phoneNumber: "+15551234567",
    department: null,
    role: null,
    preferredLanguage: "en-US",
    companyId,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  });
  const result = await getEmployeeByPhoneNumber(db, "+15551234567");
  expect(result).not.toBeNull();
  expect(result!.phoneNumber).toBe("+15551234567");
  expect(result!.fullName).toBe("Jane");
});

test("getEmployeeByPhoneNumber returns null when not found", async () => {
  const db = await createTestDb();
  const result = await getEmployeeByPhoneNumber(db, "+15559999999");
  expect(result).toBeNull();
});

test("getEmployeeByPhoneNumber returns null when soft-deleted", async () => {
  const db = await createTestDb();
  const companyId = await seedCompany(db);
  const id = uuidv7();
  const now = new Date().toISOString();
  await db.insert(employees).values({
    id,
    employeeNumber: "001",
    fullName: "Deleted",
    email: "del@ing.com",
    phoneNumber: "+15551234567",
    department: null,
    role: null,
    preferredLanguage: "en-US",
    companyId,
    createdAt: now,
    updatedAt: now,
    deletedAt: now,
  });
  const result = await getEmployeeByPhoneNumber(db, "+15551234567");
  expect(result).toBeNull();
});

test("createEmployee inserts and returns employee", async () => {
  const db = await createTestDb();
  const companyId = await seedCompany(db);
  const id = uuidv7();
  const result = await createEmployee(db, {
    id,
    employeeNumber: "001",
    fullName: "Jane",
    email: "jane@ing.com",
    phoneNumber: "+15551111111",
    companyId,
    department: "IT",
    preferredLanguage: "de-DE",
  });
  expect(result.id).toBe(id);
  expect(result.fullName).toBe("Jane");
  expect(result.department).toBe("IT");
  expect(result.preferredLanguage).toBe("de-DE");
  expect(result.deletedAt).toBeNull();
});

test("updateEmployee updates and returns employee", async () => {
  const db = await createTestDb();
  const companyId = await seedCompany(db);
  const id = uuidv7();
  const now = new Date().toISOString();
  await db.insert(employees).values({
    id,
    employeeNumber: "001",
    fullName: "Jane",
    email: "jane@ing.com",
    phoneNumber: "+15551111111",
    department: null,
    role: null,
    preferredLanguage: "en-US",
    companyId,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  });
  const result = await updateEmployee(db, id, {
    fullName: "Jane Doe",
    email: "jane.doe@ing.com",
    department: "Sales",
  });
  expect(result).not.toBeNull();
  expect(result!.fullName).toBe("Jane Doe");
  expect(result!.email).toBe("jane.doe@ing.com");
  expect(result!.department).toBe("Sales");
});

test("updateEmployee partial update", async () => {
  const db = await createTestDb();
  const companyId = await seedCompany(db);
  const id = uuidv7();
  const now = new Date().toISOString();
  await db.insert(employees).values({
    id,
    employeeNumber: "001",
    fullName: "Jane",
    email: "jane@ing.com",
    phoneNumber: "+15551111111",
    department: null,
    role: null,
    preferredLanguage: "en-US",
    companyId,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  });
  const result = await updateEmployee(db, id, { role: "Manager" });
  expect(result).not.toBeNull();
  expect(result!.fullName).toBe("Jane");
  expect(result!.role).toBe("Manager");
});

test("updateEmployee returns null when not found", async () => {
  const db = await createTestDb();
  const result = await updateEmployee(db, uuidv7(), { fullName: "Nope" });
  expect(result).toBeNull();
});

test("updateEmployee returns null when soft-deleted", async () => {
  const db = await createTestDb();
  const companyId = await seedCompany(db);
  const id = uuidv7();
  const now = new Date().toISOString();
  await db.insert(employees).values({
    id,
    employeeNumber: "001",
    fullName: "Deleted",
    email: "del@ing.com",
    phoneNumber: "+15551111111",
    department: null,
    role: null,
    preferredLanguage: "en-US",
    companyId,
    createdAt: now,
    updatedAt: now,
    deletedAt: now,
  });
  const result = await updateEmployee(db, id, { fullName: "Nope" });
  expect(result).toBeNull();
});

test("softDeleteEmployee sets deletedAt", async () => {
  const db = await createTestDb();
  const companyId = await seedCompany(db);
  const id = uuidv7();
  const now = new Date().toISOString();
  await db.insert(employees).values({
    id,
    employeeNumber: "001",
    fullName: "Jane",
    email: "jane@ing.com",
    phoneNumber: "+15551111111",
    department: null,
    role: null,
    preferredLanguage: "en-US",
    companyId,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  });
  await softDeleteEmployee(db, id);
  const list = await listEmployees(db);
  expect(list).toHaveLength(0);
  const get = await getEmployeeById(db, id);
  expect(get).toBeNull();
});
