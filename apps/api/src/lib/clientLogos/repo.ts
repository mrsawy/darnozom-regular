import { z } from "zod";
import { and, asc, eq, sql } from "drizzle-orm";
import { db, clientLogos, type ClientLogo } from "@workspace/db";

const isSitePath = (v: string) => v.startsWith("/") && !/^\/[\/\\]/.test(v);
const isHttpUrl = (v: string) => /^https?:\/\/[^\s/\\]/i.test(v);
const urlOrPath = z
  .string()
  .trim()
  .max(1000)
  .refine((v) => v === "" || isSitePath(v) || isHttpUrl(v), "Must be an http(s) URL or a site path")
  .optional()
  .default("");

export const clientLogoInput = z.object({
  nameAr: z.string().trim().min(1).max(200),
  nameEn: z.string().trim().max(200).optional().default(""),
  descriptionAr: z.string().trim().max(5000).optional().default(""),
  descriptionEn: z.string().trim().max(5000).optional().default(""),
  logoUrl: urlOrPath,
  websiteUrl: urlOrPath,
  darkBackground: z.boolean().optional().default(false),
  isActive: z.boolean().optional().default(true),
});
export type ClientLogoInput = z.infer<typeof clientLogoInput>;

const publicCols = {
  id: clientLogos.id,
  nameAr: clientLogos.nameAr,
  nameEn: clientLogos.nameEn,
  descriptionAr: clientLogos.descriptionAr,
  descriptionEn: clientLogos.descriptionEn,
  logoUrl: clientLogos.logoUrl,
  websiteUrl: clientLogos.websiteUrl,
  darkBackground: clientLogos.darkBackground,
};

/** Public shape: only active clients, in display order. */
export async function listPublicClientLogos() {
  return db
    .select(publicCols)
    .from(clientLogos)
    .where(eq(clientLogos.isActive, true))
    .orderBy(asc(clientLogos.position), asc(clientLogos.id));
}

export async function getPublicClientLogo(id: number) {
  const [row] = await db
    .select(publicCols)
    .from(clientLogos)
    .where(and(eq(clientLogos.id, id), eq(clientLogos.isActive, true)));
  return row ?? null;
}

export const listClientLogosAdmin = (): Promise<ClientLogo[]> =>
  db.select().from(clientLogos).orderBy(asc(clientLogos.position), asc(clientLogos.id));

export async function createClientLogo(v: ClientLogoInput): Promise<ClientLogo> {
  const [{ max }] = await db
    .select({ max: sql<number>`coalesce(max(${clientLogos.position}), -1)` })
    .from(clientLogos);
  const [row] = await db.insert(clientLogos).values({ ...v, position: Number(max) + 1 }).returning();
  return row;
}

export async function updateClientLogo(id: number, v: ClientLogoInput): Promise<ClientLogo | null> {
  const [row] = await db
    .update(clientLogos)
    .set({ ...v, updatedAt: new Date() })
    .where(eq(clientLogos.id, id))
    .returning();
  return row ?? null;
}

export async function deleteClientLogo(id: number): Promise<boolean> {
  const rows = await db.delete(clientLogos).where(eq(clientLogos.id, id)).returning({ id: clientLogos.id });
  return rows.length > 0;
}

export async function reorderClientLogos(ids: number[]): Promise<void> {
  await db.transaction(async (tx) => {
    for (const [position, id] of ids.entries()) {
      await tx.update(clientLogos).set({ position, updatedAt: new Date() }).where(eq(clientLogos.id, id));
    }
  });
}
