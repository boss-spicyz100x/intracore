import { drizzle } from "drizzle-orm/bun-sql";
import { openapi } from "@elysiajs/openapi";
import { Elysia, t } from "elysia";
import * as schema from "./src/db/schema.postgres";
import { ticketsRouter } from "./src/routes/v1/tickets";
import { companiesRouter } from "./src/routes/v1/companies";
import { employeesRouter } from "./src/routes/v1/employees";
import { identityRouter } from "./src/routes/v1/identity";
import { authPlugin } from "./src/auth/middleware";
import { requestLoggerPlugin } from "./src/middleware/request-logger";
import { logger } from "./src/logger";

const db = drizzle({ connection: process.env.DATABASE_URL!, schema } as any);

const healthResponse = () => ({
  status: "ok",
  timestamp: new Date().toISOString(),
});

const port = process.env.PORT ?? 3000;

new Elysia()
  .use(requestLoggerPlugin)
  .use(
    openapi({
      path: "/docs",
      documentation: {
        info: {
          title: "Intracore API",
          description: "Intracore internal API",
          version: "1.0.0",
        },
      },
    }),
  )
  .get("/", healthResponse, { response: { 200: t.Any() } })
  .get("/health", healthResponse, { response: { 200: t.Any() } })
  .use(identityRouter(db as any))
  .use(authPlugin(db as any))
  .use(ticketsRouter(db as any))
  .use(companiesRouter(db as any))
  .use(employeesRouter(db as any))
  .listen(port, () => {
    logger.info({ port: Number(port) }, "Server listening");
  });
