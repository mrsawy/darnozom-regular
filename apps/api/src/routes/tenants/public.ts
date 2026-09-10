import { Router } from "express";
import { db } from "@workspace/db";
import { tenants } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/tenants/branding", async (req, res) => {
  try {
    const slugParam = req.query.slug as string | undefined;

    let tenant: typeof tenants.$inferSelect | undefined;

    if (slugParam) {
      const [found] = await db.select().from(tenants).where(eq(tenants.slug, slugParam)).limit(1);
      tenant = found;
    }

    if (!tenant || !tenant.isActive) {
      return res.json({
        tenantId: null,
        name: "Darnozom Consulting",
        slug: "default",
        logoUrl: null,
        primaryColor: "#1e40af",
        secondaryColor: "#1e3a5f",
        accentColor: "#3b82f6",
        isDefault: true,
      });
    }

    return res.json({
      tenantId: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      logoUrl: tenant.logoUrl,
      primaryColor: tenant.primaryColor ?? "#1e40af",
      secondaryColor: tenant.secondaryColor ?? "#1e3a5f",
      accentColor: tenant.accentColor ?? "#3b82f6",
      isDefault: false,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to get branding" });
  }
});

export default router;
