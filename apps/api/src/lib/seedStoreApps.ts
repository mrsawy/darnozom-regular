import { db, storeApps, type NewStoreApp } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "./logger";

const ICON_URL = "/darnozom-website/darnozom-n-logo.png";

const SEED_APPS: NewStoreApp[] = [
  {
    slug: "nozom",
    nameAr: "تطبيق نظم",
    nameEn: "Nozom App",
    taglineAr: "أول نظام إدارة مؤسسي إسلامي متكامل في العالم",
    taglineEn: "The world's first integrated Islamic Management System",
    descriptionAr:
      "منصة موحّدة تربط الحوكمة الشرعية بالإدارة الحديثة في تجربة واحدة، تمكّن قادة المؤسسات في مصر والشرق الأوسط من قيادة فرقهم وقراراتهم بثقة شرعية ووضوح إداري.",
    descriptionEn:
      "A unified platform that connects Sharia governance with modern management in a single experience, empowering leaders across Egypt and the Middle East to run their teams and decisions with Sharia confidence and managerial clarity.",
    iconUrl: ICON_URL,
    category: "management",
    platform: "all",
    pricing: "request",
    price: null,
    currency: "SAR",
    status: "live",
    isFeatured: true,
    isNewRelease: true,
    webUrl: "https://enterprise-hub-tarekali88.replit.app/",
    iosUrl: null,
    androidUrl: null,
    detailsUrl: "/apps/nozom",
  },
  {
    slug: "consultai",
    nameAr: "تطبيق ConsultAI",
    nameEn: "ConsultAI App",
    taglineAr: "وكيل استشاري ذكي يحلّل مؤسستك ويُنتج تقريرًا تنفيذيًا في دقائق",
    taglineEn:
      "An AI consulting agent that analyzes your organization and delivers an executive report in minutes",
    descriptionAr:
      "ConsultAI يقدّم لقادة الأعمال في مصر والمنطقة استشارة مؤسسية شاملة بسرعة لم تكن ممكنة من قبل: تحليل دقيق للوضع الراهن وتوصيات تنفيذية قابلة للتطبيق — مدعومة بأحدث نماذج الذكاء الاصطناعي.",
    descriptionEn:
      "ConsultAI gives business leaders across Egypt and the region a complete institutional consulting engagement at a speed that was not possible before: a precise diagnosis of the current state and executive, actionable recommendations — powered by the latest AI models.",
    iconUrl: ICON_URL,
    category: "ai",
    platform: "all",
    pricing: "request",
    price: null,
    currency: "SAR",
    status: "live",
    isFeatured: true,
    isNewRelease: true,
    webUrl: "/darnozom-agent/",
    iosUrl: null,
    androidUrl: null,
    detailsUrl: "/apps/consultai",
  },
];

export async function seedStoreApps(): Promise<void> {
  try {
    for (const app of SEED_APPS) {
      const [existing] = await db
        .select()
        .from(storeApps)
        .where(eq(storeApps.slug, app.slug));

      if (existing) {
        await db
          .update(storeApps)
          .set({
            nameAr: app.nameAr,
            nameEn: app.nameEn,
            taglineAr: app.taglineAr,
            taglineEn: app.taglineEn,
            descriptionAr: app.descriptionAr,
            descriptionEn: app.descriptionEn,
            iconUrl: app.iconUrl,
            category: app.category,
            platform: app.platform,
            pricing: app.pricing,
            price: app.price,
            currency: app.currency,
            status: app.status,
            isFeatured: app.isFeatured,
            isNewRelease: app.isNewRelease,
            webUrl: app.webUrl,
            iosUrl: app.iosUrl,
            androidUrl: app.androidUrl,
            detailsUrl: app.detailsUrl,
            updatedAt: new Date(),
          })
          .where(eq(storeApps.id, existing.id));
      } else {
        await db.insert(storeApps).values(app);
      }
    }
    logger.info({ count: SEED_APPS.length }, "Store apps seeded");
  } catch (err) {
    logger.error({ err }, "Failed to seed store apps");
  }
}
