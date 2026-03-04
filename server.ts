import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { swagger } from "@elysiajs/swagger";
import { Elysia } from "elysia";
import * as schema from "./src/db/schema";
import { ticketsRouter } from "./src/routes/v1/tickets";
import { companiesRouter } from "./src/routes/v1/companies";
import { employeesRouter } from "./src/routes/v1/employees";
import { identityRouter } from "./src/routes/v1/identity";

const sqlite = new Database(process.env.DATABASE_PATH ?? "./intracore.sqlite");
const db = drizzle(sqlite, { schema });

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
    })
  )
  .get("/", healthResponse)
  .get("/health", healthResponse)
  .use(ticketsRouter(db))
  .use(companiesRouter(db))
  .use(employeesRouter(db))
  .use(identityRouter(db))
  .listen(process.env.PORT ?? 3000);
