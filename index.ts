import { Elysia } from "elysia";
import { swagger } from "@elysiajs/swagger";
import { CloudflareAdapter } from "elysia/adapter/cloudflare-worker";
import { ticketsRouter } from "./src/routes/v1/tickets";

export default new Elysia({ adapter: CloudflareAdapter })
  .use(
    swagger({
      path: "/docs",
      documentation: {
        info: { title: "Intracore API", version: "1.0.0" },
        tags: [{ name: "tickets", description: "Ticket CRUD operations" }],
      },
    })
  )
  .get("/", () => ({
    status: "ok",
    timestamp: new Date().toISOString(),
  }))
  .use(ticketsRouter)
  .compile();
