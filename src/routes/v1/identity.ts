import { Elysia, t } from "elysia";
import type { AnyDB } from "../../db/tickets";
import {
  authTokenResponseSchema,
  errorResponseSchema,
  identityResponseSchema,
  sessionSchema,
  validationErrorSchema,
  whitelistSchema,
} from "../../openapi/schemas";
import { employees } from "../../db/schema.postgres";
import { eq, and, isNull } from "drizzle-orm";
import { validateGitHubToken } from "../../auth/github";
import {
  isEmailWhitelisted,
  listWhitelists,
  getWhitelistById,
  createWhitelist,
  updateWhitelist,
  deleteWhitelist,
} from "../../db/whitelist";
import { createSession, listSessions, getSessionById, revokeSession } from "../../auth/sessions";
import { authPlugin } from "../../auth/middleware";
import { whitelists } from "../../db/schema.postgres";

const verifyBody = t.Object({
  phoneNumber: t.String({ minLength: 1 }),
  email: t.String({ format: "email" }),
  employeeNumber: t.String({ minLength: 1 }),
});

const tokenBody = t.Object({
  githubToken: t.Optional(t.String()),
});

const whitelistCreateBody = t.Object({
  email: t.String({ format: "email" }),
});

const whitelistPatchBody = t.Object({
  email: t.String({ format: "email" }),
});

const idParam = t.Object({ id: t.String({ format: "uuid" }) });

function extractGitHubToken(request: Request, body?: { githubToken?: string }): string | null {
  const auth = request.headers.get("Authorization");
  if (auth?.startsWith("Bearer ")) {
    const token = auth.slice(7).trim();
    if (token) return token;
  }
  if (body?.githubToken) return body.githubToken;
  return null;
}

export function identityRouter(db: AnyDB) {
  const protectedRoutes = new Elysia()
    .use(authPlugin(db))
    .get(
      "/whitelists",
      async () => {
        const rows = await listWhitelists(db);
        return rows;
      },
      {
        detail: { summary: "List whitelists", tags: ["identity"] },
        response: { 200: t.Array(whitelistSchema) },
      },
    )
    .get(
      "/whitelists/:id",
      async ({ params, set }) => {
        const row = await getWhitelistById(db, params.id);
        if (!row) {
          set.status = 404;
          return { error: "Not Found", message: "Whitelist not found" };
        }
        return row;
      },
      {
        params: idParam,
        detail: { summary: "Get whitelist by ID", tags: ["identity"] },
        response: { 200: whitelistSchema, 404: errorResponseSchema },
      },
    )
    .post(
      "/whitelists",
      async ({ body, set }) => {
        const exists = await isEmailWhitelisted(db, body.email);
        if (exists) {
          set.status = 400;
          return { error: "Bad Request", message: "Email already in whitelist" };
        }
        const row = await createWhitelist(db, body.email);
        return row;
      },
      {
        body: whitelistCreateBody,
        detail: { summary: "Create whitelist", tags: ["identity"] },
        response: { 200: whitelistSchema, 400: errorResponseSchema },
      },
    )
    .patch(
      "/whitelists/:id",
      async ({ params, body, set }) => {
        const existing = await getWhitelistById(db, params.id);
        if (!existing) {
          set.status = 404;
          return { error: "Not Found", message: "Whitelist not found" };
        }
        const [dup] = await db
          .select()
          .from(whitelists)
          .where(eq(whitelists.email, body.email))
          .limit(1);
        if (dup && dup.id !== params.id) {
          set.status = 400;
          return { error: "Bad Request", message: "Email already in whitelist" };
        }
        const row = await updateWhitelist(db, params.id, body.email);
        return row!;
      },
      {
        params: idParam,
        body: whitelistPatchBody,
        detail: { summary: "Update whitelist", tags: ["identity"] },
        response: { 200: whitelistSchema, 400: errorResponseSchema, 404: errorResponseSchema },
      },
    )
    .delete(
      "/whitelists/:id",
      async ({ params, set }) => {
        const existing = await getWhitelistById(db, params.id);
        if (!existing) {
          set.status = 404;
          return { error: "Not Found", message: "Whitelist not found" };
        }
        await deleteWhitelist(db, params.id);
        return existing;
      },
      {
        params: idParam,
        detail: { summary: "Delete whitelist", tags: ["identity"] },
        response: { 200: whitelistSchema, 404: errorResponseSchema },
      },
    )
    .get(
      "/sessions",
      async () => {
        const rows = await listSessions(db);
        return rows;
      },
      {
        detail: { summary: "List sessions", tags: ["identity"] },
        response: { 200: t.Array(sessionSchema) },
      },
    )
    .get(
      "/sessions/:id",
      async ({ params, set }) => {
        const row = await getSessionById(db, params.id);
        if (!row) {
          set.status = 404;
          return { error: "Not Found", message: "Session not found" };
        }
        return row;
      },
      {
        params: idParam,
        detail: { summary: "Get session by ID", tags: ["identity"] },
        response: { 200: sessionSchema, 404: errorResponseSchema },
      },
    )
    .delete(
      "/sessions/:id",
      async ({ params, set }) => {
        const existing = await getSessionById(db, params.id);
        if (!existing) {
          set.status = 404;
          return { error: "Not Found", message: "Session not found" };
        }
        await revokeSession(db, params.id);
        return existing;
      },
      {
        params: idParam,
        detail: { summary: "Revoke session", tags: ["identity"] },
        response: { 200: sessionSchema, 404: errorResponseSchema },
      },
    );

  return new Elysia({ prefix: "/v1/identity" })
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
        detail: { summary: "Exchange GitHub token for session", tags: ["identity"] },
        response: {
          200: authTokenResponseSchema,
          401: errorResponseSchema,
          403: errorResponseSchema,
        },
      },
    )
    .post(
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
        response: {
          200: identityResponseSchema,
          400: validationErrorSchema,
          401: errorResponseSchema,
        },
      },
    )
    .use(protectedRoutes);
}
