import { Elysia } from "elysia";
import type { AnyDB } from "../db/tickets";
import { validateSession } from "./sessions";

const UNAUTHORIZED = { error: "Unauthorized", message: "Invalid or expired token" };

export function authPlugin(db: AnyDB) {
  return new Elysia({ name: "auth" })
    .derive(async ({ request }) => {
      const auth = request.headers.get("Authorization");
      if (!auth?.startsWith("Bearer ")) {
        return { session: null as { id: string; email: string } | null };
      }
      const token = auth.slice(7).trim();
      if (!token) {
        return { session: null as { id: string; email: string } | null };
      }
      const session = await validateSession(db, token);
      return { session };
    })
    .onBeforeHandle(({ session }) => {
      if (!session) {
        return new Response(JSON.stringify(UNAUTHORIZED), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }
    });
}
