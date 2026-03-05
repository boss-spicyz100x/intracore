import { eq } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import { whitelists } from "./schema.postgres";
import type { AnyDB } from "./tickets";

export async function isEmailWhitelisted(db: AnyDB, email: string): Promise<boolean> {
  const [r] = await db.select().from(whitelists).where(eq(whitelists.email, email)).limit(1);
  return r != null;
}

export async function listWhitelists(db: AnyDB): Promise<(typeof whitelists.$inferSelect)[]> {
  return db.select().from(whitelists);
}

export async function getWhitelistById(
  db: AnyDB,
  id: string,
): Promise<typeof whitelists.$inferSelect | null> {
  const [r] = await db.select().from(whitelists).where(eq(whitelists.id, id)).limit(1);
  return r ?? null;
}

export async function createWhitelist(
  db: AnyDB,
  email: string,
): Promise<typeof whitelists.$inferSelect> {
  const now = new Date().toISOString();
  const [row] = await db
    .insert(whitelists)
    .values({
      id: uuidv7(),
      email,
      createdAt: now,
    })
    .returning();
  return row!;
}

export async function updateWhitelist(
  db: AnyDB,
  id: string,
  email: string,
): Promise<typeof whitelists.$inferSelect | null> {
  const [row] = await db.update(whitelists).set({ email }).where(eq(whitelists.id, id)).returning();
  return row ?? null;
}

export async function deleteWhitelist(db: AnyDB, id: string): Promise<void> {
  await db.delete(whitelists).where(eq(whitelists.id, id));
}
