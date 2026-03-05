import { Elysia, t } from "elysia";
import { eq } from "drizzle-orm";
import type { AnyDB } from "../../db/tickets";
import {
  listWhitelists,
  getWhitelistById,
  createWhitelist,
  updateWhitelist,
  deleteWhitelist,
  isEmailWhitelisted,
} from "../../db/whitelist";
import { whitelists } from "../../db/schema.postgres";
import { errorResponseSchema, whitelistSchema } from "../../openapi/schemas";

const bearerSecurity = { security: [{ bearerAuth: [] as const }] } as const;

const whitelistCreateBody = t.Object({
  email: t.String({ format: "email" }),
});

const whitelistPatchBody = t.Object({
  email: t.String({ format: "email" }),
});

const idParam = t.Object({ id: t.String({ format: "uuid" }) });

export function whitelistsRouter(db: AnyDB) {
  return new Elysia({ prefix: "/v1/whitelists", detail: bearerSecurity })
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
        const rows = await listWhitelists(db);
        return rows;
      },
      {
        detail: { summary: "List whitelists", tags: ["whitelists"] },
        response: { 200: t.Array(whitelistSchema) },
      },
    )
    .get(
      "/:id",
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
        detail: { summary: "Get whitelist by ID", tags: ["whitelists"] },
        response: { 200: whitelistSchema, 404: errorResponseSchema },
      },
    )
    .post(
      "/",
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
        detail: { summary: "Create whitelist", tags: ["whitelists"] },
        response: { 200: whitelistSchema, 400: errorResponseSchema },
      },
    )
    .patch(
      "/:id",
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
        detail: { summary: "Update whitelist", tags: ["whitelists"] },
        response: { 200: whitelistSchema, 400: errorResponseSchema, 404: errorResponseSchema },
      },
    )
    .delete(
      "/:id",
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
        detail: { summary: "Delete whitelist", tags: ["whitelists"] },
        response: { 200: whitelistSchema, 404: errorResponseSchema },
      },
    );
}
