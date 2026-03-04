import { drizzle } from "drizzle-orm/bun-sql";
import { swagger } from "@elysiajs/swagger";
import { Elysia } from "elysia";
import * as schema from "./src/db/schema.sqlite";
import { ticketsRouter } from "./src/routes/v1/tickets";
import { companiesRouter } from "./src/routes/v1/companies";
import { employeesRouter } from "./src/routes/v1/employees";
import { identityRouter } from "./src/routes/v1/identity";

const db = drizzle({ connection: process.env.DATABASE_URL!, schema } as any);

const healthResponse = () => ({
  status: "ok",
  timestamp: new Date().toISOString(),
});

new Elysia()
  .use(
    swagger({
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
  .get("/", healthResponse)
  .get("/health", healthResponse)
  .use(ticketsRouter(db as any))
  .use(companiesRouter(db as any))
  .use(employeesRouter(db as any))
  .use(identityRouter(db as any))
  .listen(process.env.PORT ?? 3000);
