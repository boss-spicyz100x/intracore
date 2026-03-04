import { Elysia, t } from "elysia";
import type { AnyDB } from "../../db/tickets";
import { errorResponseSchema } from "../../openapi/schemas";
import { employees } from "../../db/schema.postgres";
import { eq, and, isNull } from "drizzle-orm";

const verifyBody = t.Object({
  phoneNumber: t.String({ minLength: 1 }),
  email: t.String({ format: "email" }),
  employeeNumber: t.String({ minLength: 1 }),
});

export function identityRouter(db: AnyDB) {
  return new Elysia({ prefix: "/v1/identity" }).post(
    "/verify",
    async ({ body, set }) => {
      const [r] = await db
        .select({
          id: employees.id,
          fullName: employees.fullName,
          email: employees.email,
          preferredLanguage: employees.preferredLanguage,
        })
        .from(employees)
        .where(
          and(
            eq(employees.phoneNumber, body.phoneNumber),
            eq(employees.email, body.email),
            eq(employees.employeeNumber, body.employeeNumber),
            isNull(employees.deletedAt),
          ),
        )
        .limit(1);

      if (!r) {
        set.status = 401;
        return {
          error: "Unauthorized",
          message: "Identity verification failed",
        };
      }

      return {
        id: r.id,
        fullName: r.fullName,
        email: r.email,
        preferredLanguage: r.preferredLanguage,
      };
    },
    {
      body: verifyBody,
      detail: { summary: "Verify employee identity", tags: ["identity"] },
      response: { 200: t.Any(), 401: errorResponseSchema, 422: t.Any() },
    },
  );
}
