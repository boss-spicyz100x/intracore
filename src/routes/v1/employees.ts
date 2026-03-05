import { Elysia, t, status as error } from "elysia";
import { errorResponseSchema, validationErrorSchema } from "../../openapi/schemas";
import { v7 as uuidv7 } from "uuid";
import type { AnyDB } from "../../db/tickets";
import {
  listEmployees,
  getEmployeeById,
  getEmployeeByEmail,
  createEmployee,
  updateEmployee,
  softDeleteEmployee,
} from "../../db/employees";
import { getCompanyById } from "../../db/companies";
import { toEmployeeDTO, employeeDTOSchema } from "../../types/employee";

const createEmployeeBody = t.Object({
  employeeNumber: t.String({ minLength: 1 }),
  fullName: t.String({ minLength: 1 }),
  email: t.String({ format: "email" }),
  phoneNumber: t.String({ minLength: 1 }),
  companyId: t.String({ format: "uuid" }),
  department: t.Optional(t.String()),
  role: t.Optional(t.String()),
  preferredLanguage: t.Optional(t.String()),
});

const updateEmployeeBody = t.Object({
  fullName: t.Optional(t.String({ minLength: 1 })),
  email: t.Optional(t.String({ format: "email" })),
  phoneNumber: t.Optional(t.String({ minLength: 1 })),
  department: t.Optional(t.String()),
  role: t.Optional(t.String()),
  preferredLanguage: t.Optional(t.String()),
});

export function employeesRouter(db: AnyDB) {
  return new Elysia({ prefix: "/v1/employees" })
    .get(
      "/",
      async ({ query }) => {
        const employees = await listEmployees(db, query.companyId);
        return employees.map(toEmployeeDTO);
      },
      {
        query: t.Object({
          companyId: t.Optional(t.String({ format: "uuid" })),
        }),
        response: { 200: t.Array(employeeDTOSchema), 422: validationErrorSchema },
        detail: { summary: "List employees", tags: ["employees"] },
      },
    )
    .post(
      "/",
      async ({ body }) => {
        const company = await getCompanyById(db, body.companyId);
        if (!company) {
          throw error(404, {
            error: "Not Found",
            message: "Company not found",
          });
        }
        const existingEmail = await getEmployeeByEmail(db, body.email);
        if (existingEmail) {
          throw error(409, {
            error: "Conflict",
            message: "Employee email already exists",
          });
        }
        const employee = await createEmployee(db, {
          id: uuidv7(),
          employeeNumber: body.employeeNumber,
          fullName: body.fullName,
          email: body.email,
          phoneNumber: body.phoneNumber,
          companyId: body.companyId,
          department: body.department,
          role: body.role,
          preferredLanguage: body.preferredLanguage,
        });
        return toEmployeeDTO(employee);
      },
      {
        body: createEmployeeBody,
        response: {
          200: employeeDTOSchema,
          404: errorResponseSchema,
          409: errorResponseSchema,
          422: validationErrorSchema,
        },
        detail: { summary: "Create employee", tags: ["employees"] },
      },
    )
    .get(
      "/:id",
      async ({ params }) => {
        const employee = await getEmployeeById(db, params.id);
        if (!employee) {
          throw error(404, {
            error: "Not Found",
            message: "Employee not found",
          });
        }
        return toEmployeeDTO(employee);
      },
      {
        params: t.Object({ id: t.String({ format: "uuid" }) }),
        response: {
          200: employeeDTOSchema,
          404: errorResponseSchema,
          422: validationErrorSchema,
        },
        detail: { summary: "Get employee by ID", tags: ["employees"] },
      },
    )
    .put(
      "/:id",
      async ({ params, body }) => {
        const existing = await getEmployeeById(db, params.id);
        if (!existing) {
          throw error(404, {
            error: "Not Found",
            message: "Employee not found",
          });
        }
        if (body.email !== undefined) {
          const emailTaken = await getEmployeeByEmail(db, body.email, params.id);
          if (emailTaken) {
            throw error(409, {
              error: "Conflict",
              message: "Employee email already exists",
            });
          }
        }
        const updated = await updateEmployee(db, params.id, {
          fullName: body.fullName,
          email: body.email,
          phoneNumber: body.phoneNumber,
          department: body.department,
          role: body.role,
          preferredLanguage: body.preferredLanguage,
        });
        return toEmployeeDTO(updated!);
      },
      {
        params: t.Object({ id: t.String({ format: "uuid" }) }),
        body: updateEmployeeBody,
        response: {
          200: employeeDTOSchema,
          404: errorResponseSchema,
          409: errorResponseSchema,
          422: validationErrorSchema,
        },
        detail: { summary: "Update employee", tags: ["employees"] },
      },
    )
    .delete(
      "/:id",
      async ({ params }) => {
        await softDeleteEmployee(db, params.id);
        return new Response(null, { status: 204 });
      },
      {
        params: t.Object({ id: t.String({ format: "uuid" }) }),
        response: { 204: t.Void(), 422: validationErrorSchema },
        detail: { summary: "Soft-delete employee (idempotent)", tags: ["employees"] },
      },
    );
}
