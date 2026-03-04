import { Elysia, t, status as error } from "elysia";
import { v7 as uuidv7 } from "uuid";
import type { AnyDB } from "../../db/tickets";
import {
  listCompanies,
  getCompanyById,
  getCompanyBySlug,
  createCompany,
  updateCompany,
  softDeleteCompany,
} from "../../db/companies";
import { errorResponseSchema } from "../../openapi/schemas";

const SLUG_PATTERN = /^[A-Z0-9]+$/;

function normalizeSlug(v: string) {
  return v.toUpperCase();
}

const createCompanyBody = t.Object({
  name: t.String({ minLength: 1 }),
  slug: t.String({ minLength: 1 }),
  description: t.Optional(t.String()),
});

const updateCompanyBody = t.Object({
  name: t.Optional(t.String({ minLength: 1 })),
  slug: t.Optional(t.String({ minLength: 1 })),
  description: t.Optional(t.String()),
});

export function companiesRouter(db: AnyDB) {
  return new Elysia({ prefix: "/v1/companies" })
    .get(
      "/",
      async () => {
        const companies = await listCompanies(db);
        return companies;
      },
      {
        detail: { summary: "List companies", tags: ["companies"] },
        response: { 200: t.Any(), 422: t.Any() },
      },
    )
    .post(
      "/",
      async ({ body }) => {
        const slug = normalizeSlug(body.slug);
        if (!SLUG_PATTERN.test(slug)) {
          throw error(400, {
            error: "Bad Request",
            message: "Slug must be uppercase letters and numbers only (e.g. ING)",
          });
        }
        const existing = await getCompanyBySlug(db, slug);
        if (existing) {
          throw error(409, {
            error: "Conflict",
            message: "Company slug already exists",
          });
        }
        const company = await createCompany(db, {
          id: uuidv7(),
          slug,
          name: body.name,
          description: body.description,
        });
        return company;
      },
      {
        body: createCompanyBody,
        detail: { summary: "Create company", tags: ["companies"] },
        response: {
          200: t.Any(),
          400: errorResponseSchema,
          409: errorResponseSchema,
          422: t.Any(),
        },
      },
    )
    .get(
      "/:id",
      async ({ params }) => {
        const company = await getCompanyById(db, params.id);
        if (!company) {
          throw error(404, {
            error: "Not Found",
            message: "Company not found",
          });
        }
        return company;
      },
      {
        params: t.Object({ id: t.String({ format: "uuid" }) }),
        detail: { summary: "Get company by ID", tags: ["companies"] },
        response: { 200: t.Any(), 404: errorResponseSchema, 422: t.Any() },
      },
    )
    .put(
      "/:id",
      async ({ params, body }) => {
        const existing = await getCompanyById(db, params.id);
        if (!existing) {
          throw error(404, {
            error: "Not Found",
            message: "Company not found",
          });
        }
        if (body.slug !== undefined) {
          const slug = normalizeSlug(body.slug);
          if (!SLUG_PATTERN.test(slug)) {
            throw error(400, {
              error: "Bad Request",
              message: "Slug must be uppercase letters and numbers only (e.g. ING)",
            });
          }
          const slugTaken = await getCompanyBySlug(db, slug, params.id);
          if (slugTaken) {
            throw error(409, {
              error: "Conflict",
              message: "Company slug already exists",
            });
          }
        }
        const updated = await updateCompany(db, params.id, {
          name: body.name,
          slug: body.slug !== undefined ? normalizeSlug(body.slug) : undefined,
          description: body.description,
        });
        return updated!;
      },
      {
        params: t.Object({ id: t.String({ format: "uuid" }) }),
        body: updateCompanyBody,
        detail: { summary: "Update company", tags: ["companies"] },
        response: {
          200: t.Any(),
          404: errorResponseSchema,
          409: errorResponseSchema,
          422: t.Any(),
        },
      },
    )
    .delete(
      "/:id",
      async ({ params }) => {
        await softDeleteCompany(db, params.id);
        return new Response(null, { status: 204 });
      },
      {
        params: t.Object({ id: t.String({ format: "uuid" }) }),
        detail: { summary: "Soft-delete company (idempotent)", tags: ["companies"] },
        response: { 204: t.Void(), 422: t.Any() },
      },
    );
}
