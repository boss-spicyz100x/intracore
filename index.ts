import { Elysia } from "elysia";
import { CloudflareAdapter } from "elysia/adapter/cloudflare-worker";
import { ticketsRouter } from "./src/routes/v1/tickets";

export default new Elysia({ adapter: CloudflareAdapter })
  .get("/", () => ({
    status: "ok",
    timestamp: new Date().toISOString(),
  }))
  .use(ticketsRouter)
  .compile();
