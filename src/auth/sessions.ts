import { eq } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import type { AnyDB } from "../db/tickets";
import { sessions } from "../db/schema.postgres";

async function hashToken(token: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function randomHex(length: number): string {
  const arr = new Uint8Array(length);
  crypto.getRandomValues(arr);
  return [...arr].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function createSession(
  db: AnyDB,
  email: string,
): Promise<{ accessToken: string; expiresAt: string }> {
  const token = crypto.randomUUID() + randomHex(16);
  const tokenHash = await hashToken(token);
  const ttl = Number(process.env.SESSION_TTL_SECONDS) || 900;
  const now = Date.now();
  const expiresAt = new Date(now + ttl * 1000);
  const createdAt = new Date(now).toISOString();
  const id = uuidv7();

  await db.insert(sessions).values({
    id,
    tokenHash,
    email,
    expiresAt: expiresAt.toISOString(),
    createdAt,
  });

  return {
    accessToken: token,
    expiresAt: expiresAt.toISOString(),
  };
}

export async function validateSession(
  db: AnyDB,
  token: string,
): Promise<{ id: string; email: string } | null> {
  const tokenHash = await hashToken(token);
  const now = new Date().toISOString();
  const [row] = await db
    .select({ id: sessions.id, email: sessions.email, expiresAt: sessions.expiresAt })
    .from(sessions)
    .where(eq(sessions.tokenHash, tokenHash))
    .limit(1);

  if (!row || row.expiresAt <= now) return null;
  return { id: row.id, email: row.email };
}

export async function listSessions(db: AnyDB) {
  return db
    .select({
      id: sessions.id,
      email: sessions.email,
      expiresAt: sessions.expiresAt,
      createdAt: sessions.createdAt,
    })
    .from(sessions);
}

export async function getSessionById(db: AnyDB, id: string) {
  const [row] = await db
    .select({
      id: sessions.id,
      email: sessions.email,
      expiresAt: sessions.expiresAt,
      createdAt: sessions.createdAt,
    })
    .from(sessions)
    .where(eq(sessions.id, id))
    .limit(1);
  return row ?? null;
}

export async function revokeSession(db: AnyDB, id: string) {
  await db.delete(sessions).where(eq(sessions.id, id));
}
