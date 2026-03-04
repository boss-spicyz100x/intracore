import { test, expect } from "bun:test";
import { createTestDb, createTestApp, seedCompanyAndEmployees, seedEmployee } from "../helpers";

test("POST /v1/identity/verify matching identity returns 200 with employee", async () => {
  const db = await createTestDb();
  const { companyId } = await seedCompanyAndEmployees(db);
  await seedEmployee(db, companyId, {
    email: "verify@test.com",
    employeeNumber: "V001",
  });
  const app = createTestApp(db);

  const res = await app.handle(
    new Request("http://localhost/v1/identity/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phoneNumber: "+15551234567",
        email: "verify@test.com",
        employeeNumber: "V001",
      }),
    }),
  );

  expect(res.status).toBe(200);
  const body = (await res.json()) as Record<string, unknown>;
  expect(body).toMatchObject({
    fullName: "Test Employee",
    email: "verify@test.com",
  });
  expect(body.id).toBeDefined();
  expect(body.preferredLanguage).toBe("en-US");
});

test("POST /v1/identity/verify non-matching identity returns 401", async () => {
  const db = await createTestDb();
  await seedCompanyAndEmployees(db);
  const app = createTestApp(db);

  const res = await app.handle(
    new Request("http://localhost/v1/identity/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phoneNumber: "+15559999999",
        email: "nonexistent@test.com",
        employeeNumber: "NONE",
      }),
    }),
  );

  expect(res.status).toBe(401);
  const body = (await res.json()) as Record<string, unknown>;
  expect(body).toMatchObject({
    error: "Unauthorized",
    message: "Identity verification failed",
  });
});

test("POST /v1/identity/verify missing required fields returns 422", async () => {
  const db = await createTestDb();
  await seedCompanyAndEmployees(db);
  const app = createTestApp(db);

  const res = await app.handle(
    new Request("http://localhost/v1/identity/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phoneNumber: "+15551234567" }),
    }),
  );

  expect(res.status).toBe(422);
});

test("POST /v1/identity/verify invalid email format returns 422", async () => {
  const db = await createTestDb();
  await seedCompanyAndEmployees(db);
  const app = createTestApp(db);

  const res = await app.handle(
    new Request("http://localhost/v1/identity/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phoneNumber: "+15551234567",
        email: "not-an-email",
        employeeNumber: "001",
      }),
    }),
  );

  expect(res.status).toBe(422);
});
