import { env } from "cloudflare:workers";
import { Elysia } from "elysia";
import { CloudflareAdapter } from "elysia/adapter/cloudflare-worker";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "./src/db/schema.sqlite";
import { ticketsRouter } from "./src/routes/v1/tickets";
import { companiesRouter } from "./src/routes/v1/companies";
import { employeesRouter } from "./src/routes/v1/employees";
import { identityRouter } from "./src/routes/v1/identity";

const db = drizzle(env.DB, { schema });

const healthResponse = () => ({
  status: "ok",
  timestamp: new Date().toISOString(),
});

export default new Elysia({ adapter: CloudflareAdapter })
  .get("/", healthResponse)
  .get("/health", healthResponse)
  .use(ticketsRouter(db))
  .use(companiesRouter(db))
  .use(employeesRouter(db))
  .use(identityRouter(db))
  .compile();
