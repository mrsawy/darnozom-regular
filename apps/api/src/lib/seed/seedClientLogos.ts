import { db, clientLogos, siteSettings, type NewClientLogo } from "@workspace/db";
import { eq, sql } from "drizzle-orm";

const P = "/darnozom-website/partners";

// Placeholder copy only: neutral wording, no claims about the work done. Edit per client in the admin panel.
const blurb = (nameAr: string, nameEn: string) => ({
  descriptionAr: `${nameAr} من عملاء دار نظم الذين نعتز بثقتهم وشراكتهم. يمكن تحديث هذه النبذة من لوحة التحكم.`,
  descriptionEn: `${nameEn} is one of DarNozom's valued clients. This summary can be updated from the admin panel.`,
});

const RAW: Omit<NewClientLogo, "position" | "descriptionAr" | "descriptionEn">[] = [
  { nameAr: "كيم ويل", nameEn: "ChemWell", logoUrl: `${P}/chemwell.webp` },
  { nameAr: "روزويل للطاقة", nameEn: "Rosewell Energy", logoUrl: `${P}/rosewell.png` },
  { nameAr: "كليم.AI", nameEn: "Kaleem.ai", logoUrl: `${P}/kaleem.png`, darkBackground: true },
  { nameAr: "بلينك 22", nameEn: "Blink22", logoUrl: `${P}/blink22.png`, darkBackground: true },
  { nameAr: "دار الأمل للنشر", nameEn: "Dar Al Amal Publishing", logoUrl: `${P}/dar-al-amal.png` },
  { nameAr: "أكاديمية القادة الإسلامية", nameEn: "Islam Leaders Academy", logoUrl: `${P}/leaders-academy.jpg` },
  { nameAr: "مسجد أبو بكر كولن", nameEn: "Abubakr Moschee Köln", logoUrl: `${P}/abubakr-moschee.jpeg` },
  { nameAr: "مؤسسة مارشال", nameEn: "Marshall Group", logoUrl: `${P}/marshall.png` },
  { nameAr: "أسباير", nameEn: "Aspire", logoUrl: `${P}/aspire.png` },
];

const SEED: Omit<NewClientLogo, "position">[] = RAW.map((r) => ({ ...r, ...blurb(r.nameAr, r.nameEn ?? "") }));

const MARKER = "client_logos_seeded";

/** One-time seed of the logos the old site showed. A marker keeps it from returning after the admin deletes them. */
export async function seedClientLogos(): Promise<void> {
  const [done] = await db.select().from(siteSettings).where(eq(siteSettings.key, MARKER));
  if (done) return;
  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(clientLogos);
  if (n === 0) await db.insert(clientLogos).values(SEED.map((r, position) => ({ ...r, position })));
  await db.insert(siteSettings).values({ key: MARKER, value: "true", valueType: "boolean" }).onConflictDoNothing();
}
