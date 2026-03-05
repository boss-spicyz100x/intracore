import { Elysia, t } from "elysia";
import type { AnyDB } from "../../db/tickets";
import {
  authTokenResponseSchema,
  errorResponseSchema,
  identityResponseSchema,
  validationErrorSchema,
} from "../../openapi/schemas";
import { employees } from "../../db/schema.postgres";
import { eq, and, isNull } from "drizzle-orm";
import { validateGitHubToken } from "../../auth/github";
import { isEmailWhitelisted } from "../../db/whitelist";
import { createSession, validateSession } from "../../auth/sessions";

const UNAUTHORIZED = { error: "Unauthorized", message: "Invalid or expired token" };

const verifyBody = t.Object({
  phoneNumber: t.String({ minLength: 1 }),
  email: t.String({ format: "email" }),
  employeeNumber: t.String({ minLength: 1 }),
});

const tokenBody = t.Object({
  githubToken: t.Optional(t.String()),
});

function extractGitHubToken(request: Request, body?: { githubToken?: string }): string | null {
  const auth = request.headers.get("Authorization");
  if (auth?.startsWith("Bearer ")) {
    const token = auth.slice(7).trim();
    if (token) return token;
  }
  if (body?.githubToken) return body.githubToken;
  return null;
}

export function authRouter(db: AnyDB) {
  const bearerSecurity = { security: [{ bearerAuth: [] as const }] } as const;

  const authGuard = {
    detail: bearerSecurity,
    async beforeHandle({ request }: { request: Request }) {
      const auth = request.headers.get("Authorization");
      if (!auth?.startsWith("Bearer ")) {
        return new Response(JSON.stringify(UNAUTHORIZED), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }
      const token = auth.slice(7).trim();
      if (!token) {
        return new Response(JSON.stringify(UNAUTHORIZED), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }
      const session = await validateSession(db, token);
      if (!session) {
        return new Response(JSON.stringify(UNAUTHORIZED), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }
    },
    async derive({ request }: { request: Request }) {
      const auth = request.headers.get("Authorization");
      if (!auth?.startsWith("Bearer "))
        return { session: null as { id: string; email: string } | null };
      const token = auth.slice(7).trim();
      const session = await validateSession(db, token);
      return { session };
    },
  };

  const verifyRoute = new Elysia().guard(authGuard).post(
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
      detail: { summary: "Verify employee identity", tags: ["auth"] },
      response: {
        200: identityResponseSchema,
        400: validationErrorSchema,
        401: errorResponseSchema,
      },
    },
  );

  return new Elysia({ prefix: "/v1/auth" })
    .onError(({ code, error: handlerError }) => {
      if (code === "VALIDATION")
        return new Response((handlerError as Error).message, {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
    })
    .post(
      "/token",
      async ({ request, body, set }) => {
        const token = extractGitHubToken(request, body);
        if (!token) {
          set.status = 401;
          return { error: "Unauthorized", message: "Missing or invalid GitHub token" };
        }
        const user = await validateGitHubToken(token);
        if (!user) {
          set.status = 401;
          return { error: "Unauthorized", message: "Invalid GitHub token" };
        }
        const allowed = await isEmailWhitelisted(db, user.email);
        if (!allowed) {
          set.status = 403;
          return { error: "Forbidden", message: "Email not in whitelist" };
        }
        const session = await createSession(db, user.email);
        return {
          accessToken: session.accessToken,
          expiresAt: session.expiresAt,
          tokenType: "Bearer" as const,
        };
      },
      {
        body: tokenBody,
        detail: { summary: "Exchange GitHub token for session", tags: ["auth"] },
        response: {
          200: authTokenResponseSchema,
          401: errorResponseSchema,
          403: errorResponseSchema,
        },
      },
    )
    .use(verifyRoute);
}
