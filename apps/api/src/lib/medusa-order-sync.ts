import { medusaAdmin } from "./medusa-admin";

/**
 * Mirrors a successful storefront (Express) order into Medusa Admin > Orders.
 *
 * Storefront checkout never creates Medusa orders — it writes to the Express
 * `orders` table only. Without this sync, Medusa Admin's Orders page stays
 * empty while darnozom.com/admin/orders shows every real purchase (same
 * dual-dashboard gap we closed for Customers via syncMedusaCustomer).
 *
 * Implementation: create a draft order via the Admin API, then convert it
 * so it appears under Orders (not Draft Orders). Best-effort — never block
 * the real Express order.
 */

export type SyncMedusaOrderItem = {
  title: string;
  quantity: number;
  unitPrice: number;
  /** Medusa variant id when the line came from a Medusa book product. */
  variantId?: string | null;
};

export type SyncMedusaOrderInput = {
  /** Express order id — stamped into Medusa metadata for cross-reference. */
  darnozomOrderId: number;
  email: string;
  fullName: string;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  currencyCode?: string;
  shippingTotal?: number;
  items: SyncMedusaOrderItem[];
  paymentMethod?: string;
};

function splitFullName(fullName: string): { first_name: string; last_name?: string } {
  const trimmed = fullName.trim();
  const spaceIdx = trimmed.indexOf(" ");
  if (spaceIdx === -1) return { first_name: trimmed };
  const last = trimmed.slice(spaceIdx + 1).trim();
  return last ? { first_name: trimmed.slice(0, spaceIdx), last_name: last } : { first_name: trimmed };
}

async function resolveRegionId(): Promise<string> {
  const res = await medusaAdmin<{ regions: Array<{ id: string }> }>(
    "/admin/regions?limit=1",
  );
  const id = res.regions?.[0]?.id;
  if (!id) throw new Error("No Medusa region configured — cannot sync order");
  return id;
}

async function resolveSalesChannelId(): Promise<string | undefined> {
  const res = await medusaAdmin<{ sales_channels: Array<{ id: string }> }>(
    "/admin/sales-channels?limit=1",
  );
  return res.sales_channels?.[0]?.id;
}

export async function syncMedusaOrder(input: SyncMedusaOrderInput): Promise<{ medusaOrderId: string }> {
  const email = input.email.trim().toLowerCase();
  if (!email) throw new Error("email is required to sync a Medusa order");
  if (!input.items.length) throw new Error("items are required to sync a Medusa order");

  const regionId = await resolveRegionId();
  const salesChannelId = await resolveSalesChannelId();
  const names = splitFullName(input.fullName);
  const currency = (input.currencyCode || "egp").toLowerCase();

  const draftItems: Array<{
    title?: string;
    variant_id?: string;
    quantity: number;
    unit_price: number;
    metadata?: Record<string, unknown>;
  }> = input.items.map((it) => {
    if (it.variantId) {
      return {
        variant_id: it.variantId,
        quantity: it.quantity,
        unit_price: it.unitPrice,
        title: it.title,
        metadata: { darnozom_order_id: input.darnozomOrderId },
      };
    }
    // Custom line (legacy book / course / app) — no Medusa variant.
    return {
      title: it.title,
      quantity: it.quantity,
      unit_price: it.unitPrice,
      metadata: { darnozom_order_id: input.darnozomOrderId },
    };
  });

  if (input.shippingTotal && input.shippingTotal > 0) {
    draftItems.push({
      title: "Shipping",
      quantity: 1,
      unit_price: input.shippingTotal,
      metadata: { darnozom_order_id: input.darnozomOrderId, kind: "shipping" },
    });
  }

  const address =
    input.address || input.city
      ? {
          first_name: names.first_name,
          last_name: names.last_name,
          phone: input.phone || undefined,
          address_1: input.address || undefined,
          city: input.city || undefined,
          country_code: "eg",
        }
      : undefined;

  const created = await medusaAdmin<{ draft_order: { id: string } }>(
    "/admin/draft-orders",
    {
      method: "POST",
      body: JSON.stringify({
        email,
        region_id: regionId,
        sales_channel_id: salesChannelId,
        currency_code: currency,
        items: draftItems,
        shipping_address: address,
        billing_address: address,
        no_notification_order: true,
        metadata: {
          darnozom_order_id: input.darnozomOrderId,
          payment_method: input.paymentMethod || null,
          source: "darnozom_storefront",
        },
      }),
    },
  );

  const draftId = created.draft_order.id;
  const converted = await medusaAdmin<{ order: { id: string } }>(
    `/admin/draft-orders/${encodeURIComponent(draftId)}/convert-to-order`,
    { method: "POST", body: "{}" },
  );

  return { medusaOrderId: converted.order?.id ?? draftId };
}
