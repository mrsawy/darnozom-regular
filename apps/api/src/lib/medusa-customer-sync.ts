import { medusaAdmin } from "./medusa-admin";

/**
 * Keeps a Medusa Customer record (Admin > Customers) in sync with the app's
 * own identity/profile data.
 *
 * - Guests (no Better Auth session): has_account=false
 * - Registered (signed in): has_account=true + betterAuthUserId metadata
 *
 * Returns the Medusa customer id so the mirrored draft order can set
 * customer_id (email-only drafts leave buyers looking like guests).
 */

interface MedusaAdminCustomer {
  id: string;
  email: string;
  has_account?: boolean;
  metadata?: Record<string, unknown> | null;
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
  /** When set, buyer is a signed-in Better Auth user → registered Medusa customer. */
  betterAuthUserId?: string | null;
}): Promise<{ customerId: string | null }> {
  const email = input.email.trim().toLowerCase();
  if (!email) return { customerId: null };
  const { first_name, last_name } = splitFullName(input.fullName);
  const isRegistered = Boolean(input.betterAuthUserId);
  const metadata: Record<string, unknown> = {
    source: isRegistered ? "darnozom_registered" : "darnozom_guest",
  };
  if (input.betterAuthUserId) {
    metadata.betterAuthUserId = input.betterAuthUserId;
  }

  try {
    const existing = await medusaAdmin<{ customers: MedusaAdminCustomer[] }>(
      `/admin/customers?email=${encodeURIComponent(email)}&limit=1`,
    );
    const match = existing.customers[0];

    if (match) {
      // Promote guest → registered when they later check out signed-in.
      // Never demote a registered customer back to guest.
      const promote =
        isRegistered && match.has_account !== true
          ? { has_account: true as const }
          : {};
      const nextMeta = {
        ...(match.metadata ?? {}),
        ...metadata,
      };
      await medusaAdmin(`/admin/customers/${match.id}`, {
        method: "POST",
        body: JSON.stringify({
          first_name,
          last_name,
          phone: input.phone || undefined,
          metadata: nextMeta,
          ...promote,
        }),
      });
      return { customerId: match.id };
    }

    const created = await medusaAdmin<{ customer: MedusaAdminCustomer }>(
      "/admin/customers",
      {
        method: "POST",
        body: JSON.stringify({
          email,
          first_name,
          last_name,
          phone: input.phone || undefined,
          has_account: isRegistered,
          metadata,
        }),
      },
    );
    return { customerId: created.customer?.id ?? null };
  } catch (err) {
    // Best-effort: caller logs; never block a real order.
    throw err;
  }
}
