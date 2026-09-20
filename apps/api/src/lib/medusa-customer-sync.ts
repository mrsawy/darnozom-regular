import { medusaAdmin } from "./medusa-admin";

/**
 * Keeps a Medusa Customer record (Admin > Customers) in sync with the app's
 * own identity/profile data. Medusa's Customer entity is otherwise
 * completely unused — no cart is ever associated with one, and the
 * better-auth-bridge auth provider only creates an AuthIdentity, a
 * different, more primitive entity (see apps/medusa/src/modules/better-auth-bridge/service.ts).
 * Without this, Medusa Admin's Customers page shows nothing real, while the
 * storefront's own admin (Orders page) shows every actual buyer from the
 * `orders` table — two dashboards with no relationship to each other.
 *
 * Called from order creation (the point where a verified email + the
 * checkout's name/phone are already in hand). Find-or-create by email:
 * Medusa email lookups are case-insensitive-safe here because we lowercase
 * before both the query and the create.
 */

interface MedusaAdminCustomer {
  id: string;
  email: string;
}

function splitFullName(fullName: string): { first_name: string; last_name: string | null } {
  const trimmed = fullName.trim();
  const spaceIdx = trimmed.indexOf(" ");
  if (spaceIdx === -1) return { first_name: trimmed, last_name: null };
  return {
    first_name: trimmed.slice(0, spaceIdx),
    last_name: trimmed.slice(spaceIdx + 1).trim() || null,
  };
}

export async function syncMedusaCustomer(input: {
  email: string;
  fullName: string;
  phone?: string | null;
}): Promise<void> {
  const email = input.email.trim().toLowerCase();
  if (!email) return;
  const { first_name, last_name } = splitFullName(input.fullName);

  try {
    const existing = await medusaAdmin<{ customers: MedusaAdminCustomer[] }>(
      `/admin/customers?email=${encodeURIComponent(email)}&limit=1`,
    );
    const match = existing.customers[0];

    if (match) {
      await medusaAdmin(`/admin/customers/${match.id}`, {
        method: "POST",
        body: JSON.stringify({
          first_name,
          last_name,
          phone: input.phone || undefined,
        }),
      });
      return;
    }

    await medusaAdmin("/admin/customers", {
      method: "POST",
      body: JSON.stringify({
        email,
        first_name,
        last_name,
        phone: input.phone || undefined,
      }),
    });
  } catch (err) {
    // Best-effort, same posture as the checkoutProfiles upsert right next to
    // this call in orders/index.ts: a sync failure must never block a real
    // order from being placed. The caller logs it; Medusa's Customers page
    // simply misses/lags this one customer until the next successful order.
    throw err;
  }
}
