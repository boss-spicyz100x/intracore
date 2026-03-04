import { test, expect } from "bun:test";
import { v7 as uuidv7 } from "uuid";
import { createTestDb } from "../helpers";
import {
  listCompanies,
  getCompanyById,
  getCompanyBySlug,
  createCompany,
  updateCompany,
  softDeleteCompany,
} from "../../src/db/companies";
import { companies } from "../../src/db/schema.sqlite";

test("listCompanies returns empty when no companies", async () => {
  const db = await createTestDb();
  const result = await listCompanies(db);
  expect(result).toEqual([]);
});

test("listCompanies returns non-deleted companies only", async () => {
  const db = await createTestDb();
  const now = new Date().toISOString();
  const id1 = uuidv7();
  const id2 = uuidv7();
  await db.insert(companies).values([
    {
      id: id1,
      slug: "ING",
      name: "Ingfah",
      description: null,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    },
    {
      id: id2,
      slug: "ACME",
      name: "Acme",
      description: null,
      createdAt: now,
      updatedAt: now,
      deletedAt: now,
    },
  ]);
  const result = await listCompanies(db);
  expect(result).toHaveLength(1);
  expect(result[0]!.slug).toBe("ING");
});

test("getCompanyById returns company when found", async () => {
  const db = await createTestDb();
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
  const result = await getCompanyById(db, id);
  expect(result).not.toBeNull();
  expect(result!.id).toBe(id);
  expect(result!.slug).toBe("ING");
  expect(result!.name).toBe("Ingfah");
});

test("getCompanyById returns null when not found", async () => {
  const db = await createTestDb();
  const result = await getCompanyById(db, uuidv7());
  expect(result).toBeNull();
});

test("getCompanyById returns null when soft-deleted", async () => {
  const db = await createTestDb();
  const now = new Date().toISOString();
  const id = uuidv7();
  await db.insert(companies).values({
    id,
    slug: "DEL",
    name: "Deleted",
    description: null,
    createdAt: now,
    updatedAt: now,
    deletedAt: now,
  });
  const result = await getCompanyById(db, id);
  expect(result).toBeNull();
});

test("getCompanyBySlug returns company when found", async () => {
  const db = await createTestDb();
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
  const result = await getCompanyBySlug(db, "ING");
  expect(result).not.toBeNull();
  expect(result!.slug).toBe("ING");
});

test("getCompanyBySlug returns null when not found", async () => {
  const db = await createTestDb();
  const result = await getCompanyBySlug(db, "NONE");
  expect(result).toBeNull();
});

test("getCompanyBySlug with excludeId excludes that company", async () => {
  const db = await createTestDb();
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
  const withExclude = await getCompanyBySlug(db, "ING", id);
  expect(withExclude).toBeNull();
  const withoutExclude = await getCompanyBySlug(db, "ING");
  expect(withoutExclude).not.toBeNull();
  expect(withoutExclude!.id).toBe(id);
});

test("createCompany inserts and returns company", async () => {
  const db = await createTestDb();
  const id = uuidv7();
  const result = await createCompany(db, {
    id,
    slug: "ING",
    name: "Ingfah",
    description: "A company",
  });
  expect(result.id).toBe(id);
  expect(result.slug).toBe("ING");
  expect(result.name).toBe("Ingfah");
  expect(result.description).toBe("A company");
  expect(result.deletedAt).toBeNull();
});

test("updateCompany updates and returns company", async () => {
  const db = await createTestDb();
  const id = uuidv7();
  const now = new Date().toISOString();
  await db.insert(companies).values({
    id,
    slug: "ING",
    name: "Ingfah",
    description: null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  });
  const result = await updateCompany(db, id, {
    name: "Ingfah Updated",
    slug: "ING2",
  });
  expect(result).not.toBeNull();
  expect(result!.name).toBe("Ingfah Updated");
  expect(result!.slug).toBe("ING2");
});

test("updateCompany partial update", async () => {
  const db = await createTestDb();
  const id = uuidv7();
  const now = new Date().toISOString();
  await db.insert(companies).values({
    id,
    slug: "ING",
    name: "Ingfah",
    description: null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  });
  const result = await updateCompany(db, id, { description: "New desc" });
  expect(result).not.toBeNull();
  expect(result!.name).toBe("Ingfah");
  expect(result!.description).toBe("New desc");
});

test("updateCompany returns null when not found", async () => {
  const db = await createTestDb();
  const result = await updateCompany(db, uuidv7(), { name: "Nope" });
  expect(result).toBeNull();
});

test("updateCompany returns null when soft-deleted", async () => {
  const db = await createTestDb();
  const id = uuidv7();
  const now = new Date().toISOString();
  await db.insert(companies).values({
    id,
    slug: "DEL",
    name: "Deleted",
    description: null,
    createdAt: now,
    updatedAt: now,
    deletedAt: now,
  });
  const result = await updateCompany(db, id, { name: "Nope" });
  expect(result).toBeNull();
});

test("softDeleteCompany sets deletedAt", async () => {
  const db = await createTestDb();
  const id = uuidv7();
  const now = new Date().toISOString();
  await db.insert(companies).values({
    id,
    slug: "ING",
    name: "Ingfah",
    description: null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  });
  await softDeleteCompany(db, id);
  const list = await listCompanies(db);
  expect(list).toHaveLength(0);
  const get = await getCompanyById(db, id);
  expect(get).toBeNull();
});
