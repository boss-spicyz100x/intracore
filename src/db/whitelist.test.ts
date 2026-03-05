import { test, expect } from "bun:test";
import { createTestDb } from "../../tests/helpers";
import {
  isEmailWhitelisted,
  createWhitelist,
  listWhitelists,
  getWhitelistById,
  updateWhitelist,
  deleteWhitelist,
} from "./whitelist";

test("isEmailWhitelisted returns false when empty", async () => {
  const db = createTestDb();
  const result = await isEmailWhitelisted(db, "test@example.com");
  expect(result).toBe(false);
});

test("createWhitelist then isEmailWhitelisted returns true", async () => {
  const db = createTestDb();
  await createWhitelist(db, "test@example.com");
  const result = await isEmailWhitelisted(db, "test@example.com");
  expect(result).toBe(true);
});

test("listWhitelists returns created whitelists", async () => {
  const db = createTestDb();
  await createWhitelist(db, "a@example.com");
  await createWhitelist(db, "b@example.com");
  const rows = await listWhitelists(db);
  expect(rows).toHaveLength(2);
  expect(rows.map((r) => r.email).sort()).toEqual(["a@example.com", "b@example.com"]);
});

test("getWhitelistById returns whitelist when found", async () => {
  const db = createTestDb();
  const created = await createWhitelist(db, "get@example.com");
  const row = await getWhitelistById(db, created.id);
  expect(row).not.toBeNull();
  expect(row!.id).toBe(created.id);
  expect(row!.email).toBe("get@example.com");
});

test("getWhitelistById returns null when not found", async () => {
  const db = createTestDb();
  const row = await getWhitelistById(db, "00000000-0000-7000-8000-000000000000");
  expect(row).toBeNull();
});

test("updateWhitelist updates email", async () => {
  const db = createTestDb();
  const created = await createWhitelist(db, "old@example.com");
  const updated = await updateWhitelist(db, created.id, "new@example.com");
  expect(updated).not.toBeNull();
  expect(updated!.email).toBe("new@example.com");
  const check = await isEmailWhitelisted(db, "new@example.com");
  expect(check).toBe(true);
});

test("updateWhitelist returns null when not found", async () => {
  const db = createTestDb();
  const result = await updateWhitelist(db, "00000000-0000-7000-8000-000000000000", "x@example.com");
  expect(result).toBeNull();
});

test("deleteWhitelist removes entry", async () => {
  const db = createTestDb();
  const created = await createWhitelist(db, "delete@example.com");
  expect(await isEmailWhitelisted(db, "delete@example.com")).toBe(true);
  await deleteWhitelist(db, created.id);
  expect(await isEmailWhitelisted(db, "delete@example.com")).toBe(false);
});
