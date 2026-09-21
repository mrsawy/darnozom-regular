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
 * so it appears under Orders (not Draft Orders). Then attach a `not_paid`
 * payment collection so Admin can Mark as paid (draft convert alone leaves
 * outstanding balance with no actionable payment UI). Best-effort — never
 * block the real Express order.
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
  /** When already paid (card/PayPal/…), mark the Medusa collection paid too. */
  paymentStatus?: string | null;
  /** Medusa customer id from syncMedusaCustomer (guest or registered). */
  customerId?: string | null;
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

function orderAmount(input: SyncMedusaOrderInput): number {
  const itemsTotal = input.items.reduce(
    (sum, it) => sum + it.unitPrice * it.quantity,
    0,
  );
  return itemsTotal + (input.shippingTotal && input.shippingTotal > 0 ? input.shippingTotal : 0);
}

type MedusaOrderPaymentShape = {
  order: {
    id: string;
    summary?: { pending_difference?: number | null } | null;
    payment_collections?: Array<{ id: string; status: string }> | null;
  };
};

/**
 * Ensures the Medusa order has a `not_paid` payment collection so Admin shows
 * Mark as paid. Optionally marks it paid immediately (online capture / COD done).
 */
export async function ensureMedusaOrderPayable(
  medusaOrderId: string,
  amountHint: number,
  options?: { markPaid?: boolean; providerId?: string },
): Promise<void> {
  const retrieved = await medusaAdmin<MedusaOrderPaymentShape>(
    `/admin/orders/${encodeURIComponent(medusaOrderId)}?fields=*payment_collections,*summary`,
  );
  const order = retrieved.order;
  const unpaid = order.payment_collections?.find((pc) => pc.status === "not_paid");

  let collectionId = unpaid?.id;
  if (!collectionId) {
    const hasActive = order.payment_collections?.some((pc) =>
      ["awaiting", "authorized", "partially_authorized", "captured"].includes(pc.status),
    );
    if (hasActive) return;

    const amount = Number(order.summary?.pending_difference ?? amountHint);
    if (!(amount > 0)) return;

    const created = await medusaAdmin<{ payment_collection: { id: string } }>(
      "/admin/payment-collections",
      {
        method: "POST",
        body: JSON.stringify({ order_id: medusaOrderId, amount }),
      },
    );
    collectionId = created.payment_collection.id;
  }

  if (options?.markPaid && collectionId) {
    await medusaAdmin(
      `/admin/payment-collections/${encodeURIComponent(collectionId)}/mark-as-paid`,
      {
        method: "POST",
        body: JSON.stringify({
          order_id: medusaOrderId,
          ...(options.providerId ? { provider_id: options.providerId } : {}),
        }),
      },
    );
  }
}

/** Find Medusa order id mirrored from an Express order (metadata.darnozom_order_id). */
export async function findMedusaOrderIdByDarnozomId(
  darnozomOrderId: number,
): Promise<string | null> {
  const res = await medusaAdmin<{
    orders: Array<{ id: string; metadata?: Record<string, unknown> | null }>;
  }>("/admin/orders?limit=100&fields=id,metadata&order=-created_at");

  const match = res.orders?.find((o) => {
    const meta = o.metadata ?? {};
    return Number(meta.darnozom_order_id) === darnozomOrderId;
  });
  return match?.id ?? null;
}

/** Mark the mirrored Medusa order paid (e.g. COD completed in Express admin). */
export async function markMedusaOrderPaidForDarnozomOrder(
  darnozomOrderId: number,
): Promise<void> {
  const medusaOrderId = await findMedusaOrderIdByDarnozomId(darnozomOrderId);
  if (!medusaOrderId) return;
  await ensureMedusaOrderPayable(medusaOrderId, 0, {
    markPaid: true,
    providerId: "pp_system_default",
  });
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
        ...(input.customerId ? { customer_id: input.customerId } : {}),
        metadata: {
          darnozom_order_id: input.darnozomOrderId,
          payment_method: input.paymentMethod || null,
          source: "darnozom_storefront",
          customer_kind: input.customerId ? undefined : "email_only",
        },
      }),
    },
  );

  const draftId = created.draft_order.id;
  const converted = await medusaAdmin<{ order: { id: string } }>(
    `/admin/draft-orders/${encodeURIComponent(draftId)}/convert-to-order`,
    { method: "POST", body: "{}" },
  );

  const medusaOrderId = converted.order?.id ?? draftId;
  const markPaid = input.paymentStatus === "paid";

  // Draft convert leaves outstanding unpaid with no collection — create one
  // so Medusa Admin shows Mark as paid. If already paid online, mark it paid.
  await ensureMedusaOrderPayable(medusaOrderId, orderAmount(input), {
    markPaid,
    providerId: markPaid ? "pp_system_default" : undefined,
  });

  return { medusaOrderId };
}
