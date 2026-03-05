import { test, expect } from "bun:test";
import {
  createTestDb,
  createTestAppWithAuth,
  seedCompanyAndEmployees,
  seedEmployee,
} from "../helpers";

async function getAccessToken(app: Awaited<ReturnType<typeof createTestAppWithAuth>>) {
  const res = await app.handle(
    new Request("http://localhost/v1/identity/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer valid-token",
      },
      body: JSON.stringify({}),
    }),
  );
  expect(res.status).toBe(200);
  const body = (await res.json()) as { accessToken: string };
  return body.accessToken;
}

test("POST /v1/identity/verify matching identity returns 200 with employee", async () => {
  const db = createTestDb();
  const { companyId } = await seedCompanyAndEmployees(db);
  await seedEmployee(db, companyId, {
    email: "verify@test.com",
    employeeNumber: "V001",
  });
  const app = await createTestAppWithAuth(db, { email: "earth@100x.fi" });
  const accessToken = await getAccessToken(app);

  const res = await app.handle(
    new Request("http://localhost/v1/identity/verify", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
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
  const db = createTestDb();
  await seedCompanyAndEmployees(db);
  const app = await createTestAppWithAuth(db, { email: "earth@100x.fi" });
  const accessToken = await getAccessToken(app);

  const res = await app.handle(
    new Request("http://localhost/v1/identity/verify", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
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

test("POST /v1/identity/verify missing required fields returns 400", async () => {
  const db = createTestDb();
  await seedCompanyAndEmployees(db);
  const app = await createTestAppWithAuth(db, { email: "earth@100x.fi" });
  const accessToken = await getAccessToken(app);

  const res = await app.handle(
    new Request("http://localhost/v1/identity/verify", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ phoneNumber: "+15551234567" }),
    }),
  );

  expect(res.status).toBe(400);
});

test("POST /v1/identity/verify invalid email format returns 400", async () => {
  const db = createTestDb();
  await seedCompanyAndEmployees(db);
  const app = await createTestAppWithAuth(db, { email: "earth@100x.fi" });
  const accessToken = await getAccessToken(app);

  const res = await app.handle(
    new Request("http://localhost/v1/identity/verify", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        phoneNumber: "+15551234567",
        email: "not-an-email",
        employeeNumber: "001",
      }),
    }),
  );

  expect(res.status).toBe(400);
});

test("POST /v1/identity/verify without token returns 401", async () => {
  const db = createTestDb();
  await seedCompanyAndEmployees(db);
  const app = await createTestAppWithAuth(db, { email: "earth@100x.fi" });

  const res = await app.handle(
    new Request("http://localhost/v1/identity/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phoneNumber: "+15551234567",
        email: "jane@acme.com",
        employeeNumber: "001",
      }),
    }),
  );

  expect(res.status).toBe(401);
});
