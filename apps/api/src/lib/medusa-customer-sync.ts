import { medusaAdmin } from "./medusa-admin";

/**
 * Keeps a Medusa Customer record (Admin > Customers) in sync with checkout
 * contact data (name + phone) and app identity.
 *
 * Medusa Admin Create/Update Customer validators are Zod-strict and do NOT
 * accept `has_account` — sending it 400s the whole request, which left orders
 * syncing as email-only guests with empty name/phone. Registration state is
 * tracked in metadata instead; Medusa's has_account flag is owned by its
 * auth-identity flow.
 *
 * Returns the Medusa customer id so the mirrored draft order can set
 * customer_id (email-only drafts leave buyers looking like nameless guests).
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

function customerPayload(input: {
  first_name: string;
  last_name: string | null;
  phone?: string | null;
  metadata: Record<string, unknown>;
}) {
  return {
    first_name: input.first_name,
    last_name: input.last_name,
    phone: input.phone || undefined,
    metadata: input.metadata,
  };
}

async function updateCustomer(
  id: string,
  payload: ReturnType<typeof customerPayload>,
): Promise<string> {
  await medusaAdmin(`/admin/customers/${id}`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return id;
}

export async function syncMedusaCustomer(input: {
  email: string;
  fullName: string;
  phone?: string | null;
  /** When set, buyer is a signed-in Better Auth user → mark as registered in metadata. */
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

  const profile = customerPayload({
    first_name,
    last_name,
    phone: input.phone,
    metadata,
  });

  try {
    const existing = await medusaAdmin<{ customers: MedusaAdminCustomer[] }>(
      `/admin/customers?email=${encodeURIComponent(email)}&limit=1`,
    );
    const match = existing.customers[0];

    if (match) {
      const nextMeta = {
        ...(match.metadata ?? {}),
        ...metadata,
      };
      // Never demote a previously registered marker back to guest.
      if (
        match.metadata?.source === "darnozom_registered" &&
        !isRegistered
      ) {
        nextMeta.source = "darnozom_registered";
        if (match.metadata.betterAuthUserId) {
          nextMeta.betterAuthUserId = match.metadata.betterAuthUserId;
        }
      }
      const id = await updateCustomer(match.id, {
        ...profile,
        metadata: nextMeta,
      });
      return { customerId: id };
    }

    try {
      const created = await medusaAdmin<{ customer: MedusaAdminCustomer }>(
        "/admin/customers",
        {
          method: "POST",
          body: JSON.stringify({
            email,
            ...profile,
          }),
        },
      );
      return { customerId: created.customer?.id ?? null };
    } catch (createErr) {
      // Race / prior email-only guest from a draft order: look up again and update.
      const retry = await medusaAdmin<{ customers: MedusaAdminCustomer[] }>(
        `/admin/customers?email=${encodeURIComponent(email)}&limit=1`,
      );
      const found = retry.customers[0];
      if (!found) throw createErr;
      const id = await updateCustomer(found.id, {
        ...profile,
        metadata: { ...(found.metadata ?? {}), ...metadata },
      });
      return { customerId: id };
    }
  } catch (err) {
    // Best-effort: caller logs; never block a real order.
    throw err;
  }
}
