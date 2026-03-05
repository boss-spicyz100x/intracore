import { Elysia, t } from "elysia";
import type { AnyDB } from "../../db/tickets";
import { listSessions, getSessionById, revokeSession } from "../../auth/sessions";
import { errorResponseSchema, sessionSchema } from "../../openapi/schemas";

const bearerSecurity = { security: [{ bearerAuth: [] as const }] } as const;
const idParam = t.Object({ id: t.String({ format: "uuid" }) });

export function sessionsRouter(db: AnyDB) {
  return new Elysia({ prefix: "/v1/sessions", detail: bearerSecurity })
    .onError(({ code, error: handlerError }) => {
      if (code === "VALIDATION")
        return new Response((handlerError as Error).message, {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
    })
    .get(
      "/",
      async () => {
        const rows = await listSessions(db);
        return rows;
      },
      {
        detail: { summary: "List sessions", tags: ["sessions"] },
        response: { 200: t.Array(sessionSchema) },
      },
    )
    .get(
      "/:id",
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
        detail: { summary: "Get session by ID", tags: ["sessions"] },
        response: { 200: sessionSchema, 404: errorResponseSchema },
      },
    )
    .delete(
      "/:id",
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
        detail: { summary: "Revoke session", tags: ["sessions"] },
        response: { 200: sessionSchema, 404: errorResponseSchema },
      },
    );
}
