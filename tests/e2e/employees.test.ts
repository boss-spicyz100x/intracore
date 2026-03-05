import { test, expect } from "bun:test";
import { v7 as uuidv7 } from "uuid";
import { createTestDb, createTestApp, seedCompany } from "../helpers";

test("GET /v1/employees returns [] on empty DB", async () => {
  const db = await createTestDb();
  const app = createTestApp(db);
  const res = await app.handle(new Request("http://localhost/v1/employees"));
  expect(res.status).toBe(200);
  const body = await res.json();
  expect(body).toEqual([]);
});

test("POST /v1/employees creates employee returns 200", async () => {
  const db = await createTestDb();
  const companyId = await seedCompany(db);
  const app = createTestApp(db);

  const res = await app.handle(
    new Request("http://localhost/v1/employees", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        employeeNumber: "001",
        fullName: "Jane Doe",
        email: "jane@test.com",
        phoneNumber: "+15551234567",
        companyId,
        department: "Engineering",
        role: "Developer",
        preferredLanguage: "en-US",
      }),
    }),
  );
  expect(res.status).toBe(200);
  const body = (await res.json()) as Record<string, unknown>;
  expect(body.fullName).toBe("Jane Doe");
  expect(body.email).toBe("jane@test.com");
  expect(body.employeeNumber).toBe("001");
  expect(body.department).toBe("Engineering");
  expect(body.role).toBe("Developer");
  expect(body.preferredLanguage).toBe("en-US");
  expect(body.id).toBeDefined();
  expect(body.companyId).toBe(companyId);
});

test("POST /v1/employees missing required fields returns 400", async () => {
  const db = await createTestDb();
  const companyId = await seedCompany(db);
  const app = createTestApp(db);

  const res = await app.handle(
    new Request("http://localhost/v1/employees", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName: "No email",
        phoneNumber: "+15551111111",
        companyId,
      }),
    }),
  );
  expect(res.status).toBe(400);
});

test("POST /v1/employees non-existent companyId returns 404", async () => {
  const db = await createTestDb();
  const app = createTestApp(db);

  const res = await app.handle(
    new Request("http://localhost/v1/employees", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        employeeNumber: "001",
        fullName: "Jane",
        email: "jane@test.com",
        phoneNumber: "+15551234567",
        companyId: uuidv7(),
      }),
    }),
  );
  expect(res.status).toBe(404);
  const body = await res.json();
  expect(body).toMatchObject({
    error: "Not Found",
    message: "Company not found",
  });
});

test("POST /v1/employees duplicate email returns 409", async () => {
  const db = await createTestDb();
  const companyId = await seedCompany(db);
  const app = createTestApp(db);

  const create1 = await app.handle(
    new Request("http://localhost/v1/employees", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        employeeNumber: "001",
        fullName: "First",
        email: "same@test.com",
        phoneNumber: "+15551111111",
        companyId,
      }),
    }),
  );
  expect(create1.status).toBe(200);

  const create2 = await app.handle(
    new Request("http://localhost/v1/employees", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        employeeNumber: "002",
        fullName: "Second",
        email: "same@test.com",
        phoneNumber: "+15552222222",
        companyId,
      }),
    }),
  );
  expect(create2.status).toBe(409);
  const body = await create2.json();
  expect(body).toMatchObject({
    error: "Conflict",
    message: "Employee email already exists",
  });
});

test("GET /v1/employees/:id returns employee", async () => {
  const db = await createTestDb();
  const companyId = await seedCompany(db);
  const app = createTestApp(db);
  const createRes = await app.handle(
    new Request("http://localhost/v1/employees", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        employeeNumber: "001",
        fullName: "Get Me",
        email: "getme@test.com",
        phoneNumber: "+15551234567",
        companyId,
      }),
    }),
  );
  const employee = (await createRes.json()) as { id: string };

  const res = await app.handle(new Request(`http://localhost/v1/employees/${employee.id}`));
  expect(res.status).toBe(200);
  const body = (await res.json()) as Record<string, unknown>;
  expect(body.id).toBe(employee.id);
  expect(body.fullName).toBe("Get Me");
  expect(body.email).toBe("getme@test.com");
});

test("GET /v1/employees/:id non-existent returns 404", async () => {
  const db = await createTestDb();
  const app = createTestApp(db);
  const res = await app.handle(new Request(`http://localhost/v1/employees/${uuidv7()}`));
  expect(res.status).toBe(404);
  const body = await res.json();
  expect(body).toMatchObject({
    error: "Not Found",
    message: "Employee not found",
  });
});

test("GET /v1/employees/phone/:phoneNumber returns employee", async () => {
  const db = await createTestDb();
  const companyId = await seedCompany(db);
  const app = createTestApp(db);
  const createRes = await app.handle(
    new Request("http://localhost/v1/employees", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        employeeNumber: "001",
        fullName: "Phone Lookup",
        email: "phone@test.com",
        phoneNumber: "+15551234567",
        companyId,
      }),
    }),
  );
  expect(createRes.status).toBe(200);

  const phoneEncoded = encodeURIComponent("+15551234567");
  const res = await app.handle(new Request(`http://localhost/v1/employees/phone/${phoneEncoded}`));
  expect(res.status).toBe(200);
  const body = (await res.json()) as Record<string, unknown>;
  expect(body.fullName).toBe("Phone Lookup");
  expect(body.email).toBe("phone@test.com");
  expect(body.phoneNumber).toBe("+15551234567");
});

test("GET /v1/employees/phone/:phoneNumber non-existent returns 404", async () => {
  const db = await createTestDb();
  const app = createTestApp(db);
  const phoneEncoded = encodeURIComponent("+15559999999");
  const res = await app.handle(new Request(`http://localhost/v1/employees/phone/${phoneEncoded}`));
  expect(res.status).toBe(404);
  const body = await res.json();
  expect(body).toMatchObject({
    error: "Not Found",
    message: "Employee not found",
  });
});

test("GET /v1/employees?companyId= filters by company", async () => {
  const db = await createTestDb();
  const companyId1 = await seedCompany(db, { slug: "CO1" });
  const company2Id = await seedCompany(db, { slug: "CO2", name: "Other Co" });
  const app = createTestApp(db);

  await app.handle(
    new Request("http://localhost/v1/employees", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        employeeNumber: "001",
        fullName: "Emp1",
        email: "e1@test.com",
        phoneNumber: "+15551111111",
        companyId: companyId1,
      }),
    }),
  );
  await app.handle(
    new Request("http://localhost/v1/employees", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        employeeNumber: "001",
        fullName: "Emp2",
        email: "e2@other.com",
        phoneNumber: "+15552222222",
        companyId: company2Id,
      }),
    }),
  );

  const allRes = await app.handle(new Request("http://localhost/v1/employees"));
  expect((await allRes.json()) as unknown[]).toHaveLength(2);

  const filteredRes = await app.handle(
    new Request(`http://localhost/v1/employees?companyId=${companyId1}`),
  );
  const filtered = (await filteredRes.json()) as unknown[];
  expect(filtered).toHaveLength(1);
  expect((filtered[0] as Record<string, string>).email).toBe("e1@test.com");
});

test("PUT /v1/employees/:id updates employee", async () => {
  const db = await createTestDb();
  const companyId = await seedCompany(db);
  const app = createTestApp(db);
  const createRes = await app.handle(
    new Request("http://localhost/v1/employees", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        employeeNumber: "001",
        fullName: "Original",
        email: "orig@test.com",
        phoneNumber: "+15551234567",
        companyId,
      }),
    }),
  );
  const employee = (await createRes.json()) as { id: string };

  const res = await app.handle(
    new Request(`http://localhost/v1/employees/${employee.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName: "Updated Name",
        email: "updated@test.com",
        phoneNumber: "+15559876543",
        department: "Sales",
        role: "Manager",
        preferredLanguage: "de-DE",
      }),
    }),
  );
  expect(res.status).toBe(200);
  const body = (await res.json()) as Record<string, unknown>;
  expect(body.fullName).toBe("Updated Name");
  expect(body.email).toBe("updated@test.com");
  expect(body.phoneNumber).toBe("+15559876543");
  expect(body.department).toBe("Sales");
  expect(body.role).toBe("Manager");
  expect(body.preferredLanguage).toBe("de-DE");
});

test("PUT /v1/employees/:id partial update", async () => {
  const db = await createTestDb();
  const companyId = await seedCompany(db);
  const app = createTestApp(db);
  const createRes = await app.handle(
    new Request("http://localhost/v1/employees", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        employeeNumber: "001",
        fullName: "Partial",
        email: "partial@test.com",
        phoneNumber: "+15551234567",
        companyId,
      }),
    }),
  );
  const employee = (await createRes.json()) as { id: string };

  const res = await app.handle(
    new Request(`http://localhost/v1/employees/${employee.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ department: "HR only" }),
    }),
  );
  expect(res.status).toBe(200);
  const body = (await res.json()) as Record<string, unknown>;
  expect(body.fullName).toBe("Partial");
  expect(body.department).toBe("HR only");
});

test("PUT /v1/employees/:id non-existent returns 404", async () => {
  const db = await createTestDb();
  const app = createTestApp(db);
  const res = await app.handle(
    new Request(`http://localhost/v1/employees/${uuidv7()}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fullName: "Nope" }),
    }),
  );
  expect(res.status).toBe(404);
});

test("PUT /v1/employees/:id duplicate email returns 409", async () => {
  const db = await createTestDb();
  const companyId = await seedCompany(db);
  const app = createTestApp(db);

  const create1 = await app.handle(
    new Request("http://localhost/v1/employees", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        employeeNumber: "001",
        fullName: "First",
        email: "a@test.com",
        phoneNumber: "+15551111111",
        companyId,
      }),
    }),
  );
  expect(create1.status).toBe(200);

  const create2 = await app.handle(
    new Request("http://localhost/v1/employees", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        employeeNumber: "002",
        fullName: "Second",
        email: "b@test.com",
        phoneNumber: "+15552222222",
        companyId,
      }),
    }),
  );
  expect(create2.status).toBe(200);

  const first = (await create1.json()) as { id: string };
  const res = await app.handle(
    new Request(`http://localhost/v1/employees/${first.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "b@test.com" }),
    }),
  );
  expect(res.status).toBe(409);
  const body = await res.json();
  expect(body).toMatchObject({
    error: "Conflict",
    message: "Employee email already exists",
  });
});

test("DELETE /v1/employees/:id returns 204", async () => {
  const db = await createTestDb();
  const companyId = await seedCompany(db);
  const app = createTestApp(db);
  const createRes = await app.handle(
    new Request("http://localhost/v1/employees", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        employeeNumber: "001",
        fullName: "To Delete",
        email: "del@test.com",
        phoneNumber: "+15551234567",
        companyId,
      }),
    }),
  );
  const employee = (await createRes.json()) as { id: string };

  const res = await app.handle(
    new Request(`http://localhost/v1/employees/${employee.id}`, {
      method: "DELETE",
    }),
  );
  expect(res.status).toBe(200);
  const body = (await res.json()) as Record<string, unknown>;
  expect(body.id).toBeDefined();
  expect(body.email).toBeDefined();
});

test("DELETE /v1/employees/:id second DELETE returns 404", async () => {
  const db = await createTestDb();
  const companyId = await seedCompany(db);
  const app = createTestApp(db);
  const createRes = await app.handle(
    new Request("http://localhost/v1/employees", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        employeeNumber: "001",
        fullName: "Twice",
        email: "twice@test.com",
        phoneNumber: "+15551234567",
        companyId,
      }),
    }),
  );
  const employee = (await createRes.json()) as { id: string };

  const res1 = await app.handle(
    new Request(`http://localhost/v1/employees/${employee.id}`, {
      method: "DELETE",
    }),
  );
  expect(res1.status).toBe(200);

  const res2 = await app.handle(
    new Request(`http://localhost/v1/employees/${employee.id}`, {
      method: "DELETE",
    }),
  );
  expect(res2.status).toBe(404);
});

test("DELETE /v1/employees/:id soft-deleted employee returns 404 on GET", async () => {
  const db = await createTestDb();
  const companyId = await seedCompany(db);
  const app = createTestApp(db);
  const createRes = await app.handle(
    new Request("http://localhost/v1/employees", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        employeeNumber: "001",
        fullName: "Soft Del",
        email: "softdel@test.com",
        phoneNumber: "+15551234567",
        companyId,
      }),
    }),
  );
  const employee = (await createRes.json()) as { id: string };

  const listBefore = await app.handle(new Request("http://localhost/v1/employees"));
  expect((await listBefore.json()) as unknown[]).toHaveLength(1);

  await app.handle(
    new Request(`http://localhost/v1/employees/${employee.id}`, {
      method: "DELETE",
    }),
  );

  const listAfter = await app.handle(new Request("http://localhost/v1/employees"));
  expect((await listAfter.json()) as unknown[]).toHaveLength(0);

  const getRes = await app.handle(new Request(`http://localhost/v1/employees/${employee.id}`));
  expect(getRes.status).toBe(404);
});
