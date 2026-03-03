import { Elysia } from "elysia";
import { CloudflareAdapter } from "elysia/adapter/cloudflare-worker";
import { ticketsRouter } from "./src/routes/v1/tickets";

const healthResponse = () => ({
  status: "ok",
  timestamp: new Date().toISOString(),
});

export default new Elysia({ adapter: CloudflareAdapter })
  .get("/", healthResponse)
  .get("/health", healthResponse)
  .use(ticketsRouter)
  .compile();
