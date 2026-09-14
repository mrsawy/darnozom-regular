import { Router, type Response } from "express";
import { db } from "@workspace/db";
import {
  orders,
  orderItems,
  books,
  storeCourses,
  storeApps,
  shippingRates,
  checkoutProfiles,
  type Order,
  type OrderItem,
} from "@workspace/db";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../../middlewares/authMiddleware";
import { requireAdmin } from "../../middlewares/adminAuth";
import {
  openPrivateObjectStream,
  privateObjectExists,
  readPrivateObjectMeta,
} from "../../lib/objectStore";
import { computeFormats } from "../books";
import { convertEgpToUsd } from "../../lib/currency";
import {
  createPayPalOrder,
  capturePayPalOrder,
  getPayPalClientConfig,
} from "../../lib/payments/paypal";
import {
  markPayPalOrderPaid,
  reconcilePendingPayPalOrders,
  markOrderPaymentFailed,
  notifyAdminPaymentFailed,
  notifyCustomerOrderCancelled,
  expireStalePendingOrders,
} from "../../lib/payments/reconcilePayPalOrders";
import {
  isPaymobConfigured,
  isPaymobWalletConfigured,
  createPaymobCheckout,
  createPaymobCheckoutUrlForExistingOrder,
  createPaymobWalletPayment,
  createPaymobWalletRedirectForExistingOrder,
  getPaymobTransactionStatus,
  verifyPaymobWebhookHmac,
  extractPaymobDeclineReason,
} from "../../lib/payments/paymob";
import {
  markPaymobOrderPaid,
  reconcilePendingPaymobOrders,
} from "../../lib/payments/reconcilePaymobOrders";
import {
  sendOrderPlacedConfirmation,
  sendOrderStatusUpdate,
  sendAdminSalesNotification,
} from "../../lib/email";
import { sendOrderPaidNotifications } from "../../lib/orderPaidNotifications";

const router = Router();

type ProductType = "book" | "course" | "app";
type Format = "paper" | "digital";
type PaymentMethod = "paypal" | "card" | "wallet" | "cash_on_delivery";

// Egyptian mobile-wallet numbers: 01 followed by 9 digits (e.g. 01012345678).
// Accepts optional +2/002 country prefix and strips spaces/dashes.
function normalizeWalletPhone(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  let digits = raw.replace(/[\s\-()]/g, "");
  if (digits.startsWith("+2")) digits = digits.slice(2);
  else if (digits.startsWith("002")) digits = digits.slice(3);
  else if (digits.startsWith("2") && digits.length === 12) digits = digits.slice(1);
  if (!/^01[0-9]{9}$/.test(digits)) return null;
  return digits;
}

function sanitizeAbsoluteUrl(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!/^https?:\/\//i.test(trimmed)) return null;
  if (trimmed.length > 1000) return null;
  return trimmed;
}

interface IncomingItem {
  productType: ProductType;
  productId: number;
  quantity: number;
  format?: Format | null;
}

function parsePrice(raw: string | null | undefined): number {
  if (!raw) return 0;
  const cleaned = String(raw).replace(/[^\d.]/g, "");
  const n = Number.parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
}

interface ResolvedProduct {
  title: string;
  price: number;
  currency: string;
  imageUrl: string | null;
  digitalFileUrl?: string | null;
}

async function lookupProduct(
  productType: ProductType,
  productId: number,
  format: Format | null,
): Promise<ResolvedProduct | { error: string } | null> {
  if (productType === "book") {
    const [b] = await db
      .select()
      .from(books)
      .where(eq(books.id, productId));
    if (!b) return null;
    if (b.status === "out_of_stock") {
      return { error: `Book "${b.title}" is out of stock` };
    }
    // Use *effective* per-format flags so legacy books (with only the old
    // `format`/`price` columns set) remain orderable until an admin
    // migrates them to the new fields.
    const eff = computeFormats(b);
    const fmt = format ?? "paper";
    if (fmt === "paper") {
      if (!eff.paperAvailable) {
        return { error: `Paper edition is not available for "${b.title}"` };
      }
      return {
        title: b.title,
        price: parsePrice(eff.paperPrice),
        currency: b.currency || "EGP",
        imageUrl: b.coverImageUrl ?? null,
        digitalFileUrl: null,
      };
    }
    // digital
    if (!eff.digitalAvailable) {
      return { error: `Digital edition is not available for "${b.title}"` };
    }
    // Digital orders require a real uploaded file, even for legacy books.
    if (!b.digitalFileUrl) {
      return { error: `Digital file is not yet uploaded for "${b.title}"` };
    }
    return {
      title: b.title,
      price: parsePrice(eff.digitalPrice),
      currency: b.currency || "EGP",
      imageUrl: b.coverImageUrl ?? null,
      digitalFileUrl: b.digitalFileUrl,
    };
  }
  if (productType === "course") {
    const [c] = await db
      .select({
        title: storeCourses.titleAr,
        price: storeCourses.price,
        currency: storeCourses.currency,
        imageUrl: storeCourses.thumbnailUrl,
      })
      .from(storeCourses)
      .where(eq(storeCourses.id, productId));
    if (!c) return null;
    return {
      title: c.title,
      price: parsePrice(c.price),
      currency: c.currency || "EGP",
      imageUrl: c.imageUrl ?? null,
    };
  }
  if (productType === "app") {
    const [a] = await db
      .select({
        title: storeApps.nameAr,
        price: storeApps.price,
        currency: storeApps.currency,
        imageUrl: storeApps.iconUrl,
      })
      .from(storeApps)
      .where(eq(storeApps.id, productId));
    if (!a) return null;
    return {
      title: a.title,
      price: parsePrice(a.price),
      currency: a.currency || "EGP",
      imageUrl: a.imageUrl ?? null,
    };
  }
  return null;
}

async function lookupShippingRate(city: string): Promise<{ price: number; currency: string } | null> {
  const cityNorm = city.trim();
  if (!cityNorm) return null;
  const [exact] = await db
    .select()
    .from(shippingRates)
    .where(sql`lower(${shippingRates.city}) = lower(${cityNorm})`)
    .limit(1);
  if (exact) {
    return { price: parsePrice(exact.price), currency: exact.currency || "EGP" };
  }
  const [defaultRate] = await db
    .select()
    .from(shippingRates)
    .where(eq(shippingRates.isDefault, true))
    .limit(1);
  if (defaultRate) {
    return { price: parsePrice(defaultRate.price), currency: defaultRate.currency || "EGP" };
  }
  return null;
}

// Public client-side PayPal config for the checkout page. The client id is
// public by design (it is embedded in the JS SDK URL); the secret never leaves
// the server. When no explicit REST credentials are configured, `cardEnabled`
// is false and the checkout page hides the inline card option entirely.
router.get("/store/paypal-config", (_req, res) => {
  const config = getPayPalClientConfig();
  if (!config) {
    return res.json({ cardEnabled: false, clientId: null, environment: null });
  }
  return res.json({
    cardEnabled: true,
    clientId: config.clientId,
    environment: config.environment,
  });
});

// Public card-payment config for the checkout page. Card payments run through
// Paymob (charged in EGP directly). When the Paymob secrets are missing the
// card option stays visible on checkout but shows a setup notice and cannot be
// submitted.
router.get("/store/paymob-config", (_req, res) => {
  return res.json({
    cardEnabled: isPaymobConfigured(),
    walletEnabled: isPaymobWalletConfigured(),
  });
});

router.post("/store/orders", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const body = req.body as Record<string, unknown>;

    const fullName = String(body.fullName || "").trim();
    const phone = String(body.phone || "").trim();
    const address = body.address ? String(body.address).trim().slice(0, 2000) : null;
    const city = body.city ? String(body.city).trim().slice(0, 120) : null;
    const notes = body.notes ? String(body.notes).trim().slice(0, 2000) : null;
    const itemsRaw = Array.isArray(body.items) ? (body.items as unknown[]) : [];

    const paymentMethodRaw = String(body.paymentMethod || "").trim();
    if (
      paymentMethodRaw !== "paypal" &&
      paymentMethodRaw !== "card" &&
      paymentMethodRaw !== "wallet" &&
      paymentMethodRaw !== "cash_on_delivery"
    ) {
      return res.status(400).json({
        error:
          "A valid payment method (paypal, card, wallet or cash_on_delivery) is required",
      });
    }
    const paymentMethod = paymentMethodRaw as PaymentMethod;
    // PayPal (redirect) settles through a PayPal order in USD; card and
    // mobile wallets settle through Paymob in EGP (no conversion). Paymob
    // methods need no approve/return URLs.
    const isOnlinePayment =
      paymentMethod === "paypal" ||
      paymentMethod === "card" ||
      paymentMethod === "wallet";
    // Fail clearly before creating anything when card payments are picked but
    // the Paymob secrets have not been configured yet.
    if (paymentMethod === "card" && !isPaymobConfigured()) {
      return res.status(503).json({
        error:
          "Card payments are not configured yet. Please set the PAYMOB_API_KEY, PAYMOB_INTEGRATION_ID, PAYMOB_HMAC_SECRET and PAYMOB_IFRAME_ID secrets, or choose another payment method.",
      });
    }
    // Same guard for mobile wallets, which additionally need the dedicated
    // wallet integration id.
    if (paymentMethod === "wallet" && !isPaymobWalletConfigured()) {
      return res.status(503).json({
        error:
          "Mobile wallet payments are not configured yet. Please set the PAYMOB_API_KEY, PAYMOB_INTEGRATION_ID, PAYMOB_HMAC_SECRET, PAYMOB_IFRAME_ID and PAYMOB_WALLET_INTEGRATION_ID secrets, or choose another payment method.",
      });
    }
    // Wallet payments require the wallet phone number the buyer pays from.
    let walletPhone: string | null = null;
    if (paymentMethod === "wallet") {
      walletPhone = normalizeWalletPhone(body.walletPhone);
      if (!walletPhone) {
        return res.status(400).json({
          error:
            "A valid Egyptian wallet phone number (e.g. 01012345678) is required for wallet payments",
        });
      }
    }
    // PayPal needs URLs to return the buyer to after approval / cancellation.
    const returnUrl =
      paymentMethod === "paypal" ? sanitizeAbsoluteUrl(body.returnUrl) : null;
    const cancelUrl =
      paymentMethod === "paypal" ? sanitizeAbsoluteUrl(body.cancelUrl) : null;
    if (paymentMethod === "paypal" && (!returnUrl || !cancelUrl)) {
      return res.status(400).json({
        error: "returnUrl and cancelUrl are required for PayPal checkout",
      });
    }

    if (!fullName || !phone) {
      return res.status(400).json({ error: "Name and phone are required" });
    }
    if (itemsRaw.length === 0) {
      return res.status(400).json({ error: "Cart is empty" });
    }

    // The session already carries the address — no identity-provider round-trip.
    const email = (req.userEmail || "").toLowerCase();
    if (!email) {
      return res.status(400).json({ error: "Account email not found" });
    }

    // Validate items + collapse duplicates (same productType+productId+format).
    const itemMap = new Map<string, IncomingItem>();
    for (const raw of itemsRaw) {
      const r = raw as Record<string, unknown>;
      const productType = String(r.productType || "") as ProductType;
      const productIdNum = Number(r.productId);
      const productId = Number.isFinite(productIdNum)
        ? Math.trunc(productIdNum)
        : 0;
      const quantityNum = Number(r.quantity ?? 1);
      const quantity = Math.max(
        1,
        Math.min(99, Number.isFinite(quantityNum) ? Math.trunc(quantityNum) : 1),
      );
      if (!["book", "course", "app"].includes(productType)) {
        return res.status(400).json({ error: `Invalid productType: ${productType}` });
      }
      if (!productId || productId <= 0) {
        return res.status(400).json({ error: "Invalid productId" });
      }
      // Format only applies to books. For course/app the field is ignored
      // and persisted as null so the digital-file delivery endpoint can
      // never be tricked into resolving a non-book line as a digital
      // book purchase.
      let format: Format | null = null;
      if (productType === "book") {
        if (r.format === undefined || r.format === null || r.format === "") {
          return res.status(400).json({ error: "Book items must specify a format (paper or digital)" });
        }
        const f = String(r.format);
        if (f !== "paper" && f !== "digital") {
          return res.status(400).json({ error: `Invalid format: ${f}` });
        }
        format = f;
      }
      const key = `${productType}#${productId}#${format ?? ""}`;
      const existing = itemMap.get(key);
      if (existing) {
        existing.quantity = Math.min(99, existing.quantity + quantity);
      } else {
        itemMap.set(key, { productType, productId, quantity, format });
      }
    }
    const items: IncomingItem[] = Array.from(itemMap.values());
    if (items.length === 0) {
      return res.status(400).json({ error: "Cart is empty" });
    }

    // Resolve products (with current prices) — never trust client-side price.
    const resolved: Array<{
      productType: ProductType;
      productId: number;
      productTitle: string;
      quantity: number;
      unitPrice: number;
      currency: string;
      imageUrl: string | null;
      format: Format | null;
      digitalFileUrl: string | null;
    }> = [];
    let total = 0;
    let totalCount = 0;
    let currency = "";
    let hasPaper = false;
    let hasDigital = false;

    for (const it of items) {
      const p = await lookupProduct(it.productType, it.productId, it.format ?? null);
      if (!p) {
        return res
          .status(404)
          .json({ error: `Product not found: ${it.productType}#${it.productId}` });
      }
      if ("error" in p) {
        return res.status(400).json({ error: p.error });
      }
      const itemCurrency = (p.currency || "EGP").toUpperCase();
      if (!currency) {
        currency = itemCurrency;
      } else if (currency !== itemCurrency) {
        return res.status(400).json({
          error: `Mixed currency in cart (${currency} vs ${itemCurrency}). Please order each currency separately.`,
        });
      }
      total += p.price * it.quantity;
      totalCount += it.quantity;
      const isPaper = it.productType === "book" && it.format === "paper";
      if (isPaper) hasPaper = true;
      if (it.productType === "book" && it.format === "digital") hasDigital = true;
      resolved.push({
        productType: it.productType,
        productId: it.productId,
        productTitle: p.title,
        quantity: it.quantity,
        unitPrice: p.price,
        currency: p.currency || "EGP",
        imageUrl: p.imageUrl,
        format: it.format ?? null,
        digitalFileUrl: p.digitalFileUrl ?? null,
      });
    }

    // Digital books require an actual online payment — cash-on-delivery can
    // never unlock PDF access, so reject that combination up front.
    if (hasDigital && paymentMethod === "cash_on_delivery") {
      return res.status(400).json({
        error:
          "Digital books cannot be paid with cash on delivery. Please pay online (card or PayPal).",
      });
    }
    // Online payments are charged in USD converted from EGP; we only support
    // EGP orders for both the PayPal redirect and inline card flows.
    if (isOnlinePayment && currency !== "EGP") {
      return res.status(400).json({
        error: `Online checkout only supports EGP orders (cart is ${currency}).`,
      });
    }

    // Shipping is required only when at least one paper item is in the cart.
    let shippingTotal = 0;
    let shippingCity: string | null = null;
    if (hasPaper) {
      if (!address) {
        return res.status(400).json({ error: "Shipping address is required for paper items" });
      }
      if (!city) {
        return res.status(400).json({ error: "Shipping city is required for paper items" });
      }
      const rate = await lookupShippingRate(city);
      if (!rate) {
        return res.status(400).json({
          error: "Shipping is not available for the selected city. Please contact support.",
        });
      }
      const rateCurrency = (rate.currency || "EGP").toUpperCase();
      if (rateCurrency !== currency) {
        return res.status(400).json({
          error: `Shipping currency (${rateCurrency}) does not match cart currency (${currency}).`,
        });
      }
      shippingTotal = rate.price;
      shippingCity = city;
    }

    const [order] = await db
      .insert(orders)
      .values({
        userId,
        userEmail: email,
        fullName,
        phone,
        address,
        city,
        notes,
        totalAmount: (total + shippingTotal).toFixed(2),
        shippingTotal: shippingTotal.toFixed(2),
        shippingCity,
        currency,
        itemsCount: totalCount,
        paymentMethod,
        // COD orders start unpaid; PayPal moves to "pending" once the PayPal
        // order is created below.
        paymentStatus: "unpaid",
      })
      .returning();

    if (resolved.length) {
      await db.insert(orderItems).values(
        resolved.map((r) => ({
          orderId: order.id,
          productType: r.productType,
          productId: r.productId,
          productTitle: r.productTitle,
          imageUrl: r.imageUrl ?? undefined,
          quantity: r.quantity,
          unitPrice: r.unitPrice.toFixed(2),
          currency: r.currency,
          format: r.format,
          // Snapshot the file URL at purchase time so later admin edits don't
          // change what the customer was promised.
          digitalFileUrlSnapshot: r.format === "digital" ? r.digitalFileUrl : null,
        })),
      );
    }

    // Remember the customer's last-used checkout contact details so the next
    // checkout can pre-fill them. Notes are intentionally NOT saved (they are
    // order-specific). Best-effort: a failure here must never block the order.
    try {
      await db
        .insert(checkoutProfiles)
        .values({
          userId,
          fullName,
          phone,
          address,
          city,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: checkoutProfiles.userId,
          set: {
            fullName,
            phone,
            address,
            city,
            updatedAt: new Date(),
          },
        });
    } catch (err) {
      req.log.error({ err, orderId: order.id }, "checkout profile upsert failed");
    }

    // Dedupe: this new order supersedes the user's older *online-payment*
    // orders that are still awaiting payment and contain the exact same
    // items. Those are almost always failed/abandoned checkout retries (the
    // exact bug that produced 4 duplicate stuck orders from one purchase).
    // COD orders are never auto-cancelled — they may already be in
    // fulfillment. Best-effort: a dedupe failure must not block the order.
    try {
      const itemKey = (items: { productType: string; productId: number; format: string | null; quantity: number }[]) =>
        items
          .map((it) => `${it.productType}#${it.productId}#${it.format ?? ""}#${it.quantity}`)
          .sort()
          .join("|");
      const newKey = itemKey(
        resolved.map((r) => ({
          productType: r.productType,
          productId: r.productId,
          format: r.format,
          quantity: r.quantity,
        })),
      );
      const candidates = await db
        .select()
        .from(orders)
        .where(
          and(
            eq(orders.userId, userId),
            eq(orders.status, "pending"),
            inArray(orders.paymentStatus, ["unpaid", "pending"]),
            inArray(orders.paymentMethod, ["paypal", "card", "wallet"]),
            sql`${orders.id} <> ${order.id}`,
          ),
        );
      for (const cand of candidates) {
        const candItems = await db
          .select()
          .from(orderItems)
          .where(eq(orderItems.orderId, cand.id));
        if (
          itemKey(
            candItems.map((it) => ({
              productType: it.productType,
              productId: it.productId,
              format: it.format,
              quantity: it.quantity,
            })),
          ) !== newKey
        ) {
          continue;
        }
        // Conditional update guards against races (e.g. a background
        // reconciler flipping the old order to paid right now).
        const [cancelledDup] = await db
          .update(orders)
          .set({
            status: "cancelled",
            paymentFailureReason: "superseded_by_new_order",
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(orders.id, cand.id),
              eq(orders.status, "pending"),
              inArray(orders.paymentStatus, ["unpaid", "pending"]),
            ),
          )
          .returning();
        if (cancelledDup) {
          req.log.info(
            { oldOrderId: cand.id, newOrderId: order.id },
            "order dedupe: cancelled older duplicate unpaid order",
          );
        }
      }
    } catch (dedupeErr) {
      req.log.error(
        { err: dedupeErr, orderId: order.id },
        "order dedupe failed (non-fatal)",
      );
    }

    // Cash on delivery: order is placed immediately, awaiting fulfillment.
    if (paymentMethod === "cash_on_delivery") {
      // Confirm to the customer and alert the store admin. Non-fatal.
      try {
        await sendOrderPlacedConfirmation({
          to: email,
          orderId: order.id,
          customerName: fullName,
          currency,
          subtotal: total.toFixed(2),
          shippingTotal: shippingTotal.toFixed(2),
          totalAmount: (total + shippingTotal).toFixed(2),
          items: resolved.map((r) => ({
            id: 0,
            productTitle: r.productTitle,
            quantity: r.quantity,
            unitPrice: r.unitPrice.toFixed(2),
            format: r.format,
            isDigital: false,
          })),
        });
      } catch (emailErr) {
        req.log.error({ err: emailErr, orderId: order.id }, "COD confirmation email failed");
      }
      try {
        await sendAdminSalesNotification({
          orderId: order.id,
          stage: "in_progress",
          paymentMethod,
          customerName: fullName,
          customerEmail: email,
          phone,
          currency,
          totalAmount: (total + shippingTotal).toFixed(2),
          city: shippingCity,
          address,
          items: resolved.map((r) => ({
            productTitle: r.productTitle,
            quantity: r.quantity,
            format: r.format,
          })),
        });
      } catch (emailErr) {
        req.log.error({ err: emailErr, orderId: order.id }, "COD admin notification failed");
      }

      return res.status(201).json({
        ok: true,
        id: order.id,
        paymentMethod,
        paymentStatus: order.paymentStatus,
      });
    }

    const grandTotalEgp = total + shippingTotal;

    // Card (Paymob): charged in EGP directly — no USD conversion. Register a
    // Paymob order for the authoritative server-side total and hand the
    // hosted card iframe URL back to the client.
    if (paymentMethod === "card") {
      try {
        const checkout = await createPaymobCheckout({
          amountEgp: grandTotalEgp,
          merchantOrderId: String(order.id),
          billing: { name: fullName, email, phone, city, address },
        });
        await db
          .update(orders)
          .set({
            paymobOrderId: checkout.paymobOrderId,
            paymentStatus: "pending",
            updatedAt: new Date(),
          })
          .where(eq(orders.id, order.id));
        try {
          await sendAdminSalesNotification({
            orderId: order.id,
            stage: "in_progress",
            paymentMethod,
            customerName: fullName,
            customerEmail: email,
            phone,
            currency,
            totalAmount: grandTotalEgp.toFixed(2),
            city: shippingCity,
            address,
            reason: "طلب دفع بالبطاقة (Paymob) بانتظار إدخال بيانات البطاقة وإتمام الدفع.",
            items: resolved.map((r) => ({
              productTitle: r.productTitle,
              quantity: r.quantity,
              format: r.format,
            })),
          });
        } catch (emailErr) {
          req.log.error(
            { err: emailErr, orderId: order.id },
            "Paymob pending admin notification failed",
          );
        }
        return res.status(201).json({
          ok: true,
          id: order.id,
          paymentMethod,
          paymentStatus: "pending",
          checkoutUrl: checkout.checkoutUrl,
        });
      } catch (err) {
        req.log.error({ err, orderId: order.id }, "Paymob order creation failed");
        await db
          .update(orders)
          .set({ paymentStatus: "failed", updatedAt: new Date() })
          .where(eq(orders.id, order.id));
        try {
          await sendAdminSalesNotification({
            orderId: order.id,
            stage: "failed",
            paymentMethod,
            customerName: fullName,
            customerEmail: email,
            phone,
            currency,
            totalAmount: grandTotalEgp.toFixed(2),
            city: shippingCity,
            address,
            reason: "تعذّر بدء عملية الدفع بالبطاقة عبر Paymob.",
            items: resolved.map((r) => ({
              productTitle: r.productTitle,
              quantity: r.quantity,
              format: r.format,
            })),
          });
        } catch (emailErr) {
          req.log.error(
            { err: emailErr, orderId: order.id },
            "Paymob fail admin notification failed",
          );
        }
        return res.status(502).json({
          error: "Unable to start card checkout. Please try again.",
        });
      }
    }

    // Mobile wallet (Paymob): charged in EGP directly. Register a Paymob
    // order with the wallet integration and hand the wallet provider's
    // redirect URL back to the client. Paymob also pushes a payment request
    // to the buyer's wallet phone.
    if (paymentMethod === "wallet") {
      try {
        const walletPayment = await createPaymobWalletPayment({
          amountEgp: grandTotalEgp,
          merchantOrderId: String(order.id),
          billing: { name: fullName, email, phone, city, address },
          walletPhone: walletPhone!,
        });
        await db
          .update(orders)
          .set({
            paymobOrderId: walletPayment.paymobOrderId,
            walletPhone,
            paymentStatus: "pending",
            updatedAt: new Date(),
          })
          .where(eq(orders.id, order.id));
        try {
          await sendAdminSalesNotification({
            orderId: order.id,
            stage: "in_progress",
            paymentMethod,
            customerName: fullName,
            customerEmail: email,
            phone,
            currency,
            totalAmount: grandTotalEgp.toFixed(2),
            city: shippingCity,
            address,
            reason:
              "طلب دفع عبر محفظة إلكترونية (Paymob) بانتظار تأكيد الدفع من تطبيق المحفظة.",
            items: resolved.map((r) => ({
              productTitle: r.productTitle,
              quantity: r.quantity,
              format: r.format,
            })),
          });
        } catch (emailErr) {
          req.log.error(
            { err: emailErr, orderId: order.id },
            "Paymob wallet pending admin notification failed",
          );
        }
        return res.status(201).json({
          ok: true,
          id: order.id,
          paymentMethod,
          paymentStatus: "pending",
          redirectUrl: walletPayment.redirectUrl,
        });
      } catch (err) {
        req.log.error({ err, orderId: order.id }, "Paymob wallet order creation failed");
        await db
          .update(orders)
          .set({ paymentStatus: "failed", updatedAt: new Date() })
          .where(eq(orders.id, order.id));
        try {
          await sendAdminSalesNotification({
            orderId: order.id,
            stage: "failed",
            paymentMethod,
            customerName: fullName,
            customerEmail: email,
            phone,
            currency,
            totalAmount: grandTotalEgp.toFixed(2),
            city: shippingCity,
            address,
            reason: "تعذّر بدء عملية الدفع عبر المحفظة الإلكترونية (Paymob).",
            items: resolved.map((r) => ({
              productTitle: r.productTitle,
              quantity: r.quantity,
              format: r.format,
            })),
          });
        } catch (emailErr) {
          req.log.error(
            { err: emailErr, orderId: order.id },
            "Paymob wallet fail admin notification failed",
          );
        }
        return res.status(502).json({
          error: "Unable to start wallet checkout. Please try again.",
        });
      }
    }

    // PayPal redirect: convert the authoritative EGP total to USD server-side
    // (never trust any client amount) and create a PayPal order.
    let converted;
    try {
      converted = await convertEgpToUsd(grandTotalEgp);
    } catch (err) {
      req.log.error({ err, orderId: order.id }, "EGP→USD conversion failed");
      // Mark the order failed so it isn't left dangling; refuse to charge.
      await db
        .update(orders)
        .set({ paymentStatus: "failed", updatedAt: new Date() })
        .where(eq(orders.id, order.id));
      try {
        await sendAdminSalesNotification({
          orderId: order.id,
          stage: "failed",
          paymentMethod,
          customerName: fullName,
          customerEmail: email,
          phone,
          currency,
          totalAmount: (total + shippingTotal).toFixed(2),
          city: shippingCity,
          address,
          reason: "تعذّر تحويل العملة (سعر الصرف غير متاح) — لم يتم تحصيل الدفع.",
          items: resolved.map((r) => ({
            productTitle: r.productTitle,
            quantity: r.quantity,
            format: r.format,
          })),
        });
      } catch (emailErr) {
        req.log.error({ err: emailErr, orderId: order.id }, "admin fail-notification failed");
      }
      return res.status(503).json({
        error:
          "Unable to process payment right now (exchange rate unavailable). Please try again shortly.",
      });
    }

    try {
      const paypalOrder = await createPayPalOrder({
        usdAmount: converted.usd,
        referenceId: String(order.id),
        description: `DarNozom order #${order.id}`,
        returnUrl: returnUrl!,
        cancelUrl: cancelUrl!,
      });
      const paypalOrderId = paypalOrder.id;
      const approveUrl = paypalOrder.approveUrl;
      await db
        .update(orders)
        .set({
          paypalOrderId,
          usdAmount: converted.usd,
          exchangeRate: String(converted.rate),
          paymentStatus: "pending",
          updatedAt: new Date(),
        })
        .where(eq(orders.id, order.id));
      // A sale has started (awaiting buyer approval / capture). Alert admin.
      try {
        await sendAdminSalesNotification({
          orderId: order.id,
          stage: "in_progress",
          paymentMethod,
          customerName: fullName,
          customerEmail: email,
          phone,
          currency,
          totalAmount: (total + shippingTotal).toFixed(2),
          city: shippingCity,
          address,
          reason: "طلب PayPal بانتظار موافقة العميل وإتمام الدفع.",
          items: resolved.map((r) => ({
            productTitle: r.productTitle,
            quantity: r.quantity,
            format: r.format,
          })),
        });
      } catch (emailErr) {
        req.log.error({ err: emailErr, orderId: order.id }, "PayPal pending admin notification failed");
      }
      return res.status(201).json({
        ok: true,
        id: order.id,
        paymentMethod,
        paymentStatus: "pending",
        ...(approveUrl ? { approveUrl } : {}),
        paypalOrderId,
      });
    } catch (err) {
      req.log.error({ err, orderId: order.id }, "PayPal order creation failed");
      await db
        .update(orders)
        .set({ paymentStatus: "failed", updatedAt: new Date() })
        .where(eq(orders.id, order.id));
      try {
        await sendAdminSalesNotification({
          orderId: order.id,
          stage: "failed",
          paymentMethod,
          customerName: fullName,
          customerEmail: email,
          phone,
          currency,
          totalAmount: (total + shippingTotal).toFixed(2),
          city: shippingCity,
          address,
          reason: "تعذّر بدء عملية الدفع عبر PayPal.",
          items: resolved.map((r) => ({
            productTitle: r.productTitle,
            quantity: r.quantity,
            format: r.format,
          })),
        });
      } catch (emailErr) {
        req.log.error({ err: emailErr, orderId: order.id }, "PayPal fail admin notification failed");
      }
      return res.status(502).json({
        error: "Unable to start PayPal checkout. Please try again.",
      });
    }
  } catch (err) {
    req.log.error({ err }, "create order failed");
    return res.status(500).json({ error: "Failed to create order" });
  }
});

// Capture a PayPal order after the buyer approves it. Only the owning user may
// capture. On success the order becomes paid + confirmed, which unlocks any
// digital PDF access.
router.post(
  "/store/orders/:id/capture",
  requireAuth,
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.userId!;
      const orderId = Number(req.params.id);
      if (!Number.isFinite(orderId) || orderId <= 0) {
        return res.status(400).json({ error: "Invalid order id" });
      }
      const [order] = await db
        .select()
        .from(orders)
        .where(eq(orders.id, orderId));
      if (!order || order.userId !== userId) {
        return res.status(404).json({ error: "Order not found" });
      }
      if (
        (order.paymentMethod !== "paypal" && order.paymentMethod !== "card") ||
        !order.paypalOrderId
      ) {
        return res.status(400).json({ error: "Order is not an online payment order" });
      }
      // Idempotent: if already captured, just report success.
      if (order.paymentStatus === "paid") {
        return res.json({
          ok: true,
          id: order.id,
          paymentStatus: "paid",
          status: order.status,
        });
      }

      const result = await capturePayPalOrder(order.paypalOrderId);
      if (!result.captured) {
        // Definitive rejection (e.g. COMPLIANCE_VIOLATION): PayPal will never
        // accept a retry of this capture and auto-refunds any charged amount.
        // Mark the payment terminally failed (stores the issue code) so the
        // order drops out of the reconcile sweep and the customer sees a
        // clear failure state instead of a forever-pending order.
        if (result.permanentFailure) {
          const reason = result.failureIssue || result.status || "PAYMENT_FAILED";
          req.log.warn(
            { orderId: order.id, reason, status: result.status },
            "paypal capture permanently failed — marking order failed",
          );
          const failed = await markOrderPaymentFailed(order.id, reason);
          if (failed) {
            await notifyAdminPaymentFailed(
              failed,
              `فشل تحصيل الدفع نهائياً (رمز الخطأ: ${reason}). أي مبلغ تم خصمه يُعاد للعميل تلقائياً من PayPal. لن تتم إعادة المحاولة لهذا الطلب.`,
            );
            // Tell the customer too — includes the auto-refund note.
            await notifyCustomerOrderCancelled(failed, "payment_failed", reason);
          }
          return res.status(402).json({
            error: "Payment failed and cannot be retried for this order.",
            terminal: true,
            paymentStatus: "failed",
            failureIssue: result.failureIssue ?? null,
            paypalStatus: result.status,
          });
        }
        req.log.warn(
          { orderId: order.id, status: result.status },
          "paypal capture not completed",
        );
        try {
          const failItems = await db
            .select()
            .from(orderItems)
            .where(eq(orderItems.orderId, order.id));
          await sendAdminSalesNotification({
            orderId: order.id,
            stage: "failed",
            paymentMethod: order.paymentMethod,
            customerName: order.fullName,
            customerEmail: order.userEmail,
            phone: order.phone,
            currency: order.currency,
            totalAmount: order.totalAmount,
            city: order.shippingCity,
            address: order.address,
            reason:
              order.paymentMethod === "card"
                ? `لم يكتمل تحصيل الدفع بالبطاقة (الحالة: ${result.status || "غير معروفة"}).`
                : `لم يكتمل تحصيل الدفع عبر PayPal (الحالة: ${result.status || "غير معروفة"}).`,
            items: failItems.map((it) => ({
              productTitle: it.productTitle,
              quantity: it.quantity,
              format: it.format,
            })),
          });
        } catch (emailErr) {
          req.log.error(
            { err: emailErr, orderId: order.id },
            "capture-fail admin notification failed",
          );
        }
        return res.status(402).json({
          error: "Payment was not completed. Please try again.",
          paypalStatus: result.status,
        });
      }
      if (result.alreadyCaptured) {
        req.log.info(
          { orderId: order.id },
          "paypal order was already captured — reconciled without recharging",
        );
      }

      // Mark paid only if not already paid. This makes concurrent captures
      // (double-click / lost-response retry / two tabs / the background
      // reconciler) safe: whoever wins the conditional update stamps paidAt +
      // captureId once, and the loser falls through to re-read and report the
      // already-paid state. Never overwrite an existing captureId with null
      // (can happen on an already-captured reconciliation where PayPal didn't
      // return the capture object).
      const updated = await markPayPalOrderPaid(order.id, result.captureId);

      if (!updated) {
        // A concurrent capture already marked this order paid — report the
        // current state instead of failing.
        const [current] = await db
          .select()
          .from(orders)
          .where(eq(orders.id, order.id));
        return res.json({
          ok: true,
          id: order.id,
          paymentStatus: current?.paymentStatus ?? "paid",
          status: current?.status ?? "confirmed",
        });
      }

      // Send the customer's Arabic receipt email (with digital read/download
      // links) plus the admin "sale complete" notification. Shared with the
      // background reconciler so recovered payments get the exact same email.
      // Failures are non-fatal (same pattern as booking emails).
      await sendOrderPaidNotifications(updated);

      return res.json({
        ok: true,
        id: updated.id,
        paymentStatus: updated.paymentStatus,
        status: updated.status,
      });
    } catch (err) {
      req.log.error({ err }, "capture order failed");
      return res.status(500).json({ error: "Failed to capture payment" });
    }
  },
);

// Customer cancel: the owning user may cancel their own order while it is
// still awaiting payment / fulfillment start (status "pending") and not paid.
// This is how a buyer clears their own stuck or failed-payment orders instead
// of leaving them dangling. Paid orders must go through support/admin.
router.post(
  "/account/me/orders/:id/cancel",
  requireAuth,
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.userId!;
      const orderId = Number(req.params.id);
      if (!Number.isFinite(orderId) || orderId <= 0) {
        return res.status(400).json({ error: "Invalid order id" });
      }
      const [order] = await db
        .select()
        .from(orders)
        .where(eq(orders.id, orderId));
      if (!order || order.userId !== userId) {
        return res.status(404).json({ error: "Order not found" });
      }
      // Idempotent: cancelling an already-cancelled order just reports it.
      if (order.status === "cancelled") {
        return res.json({
          ok: true,
          id: order.id,
          status: "cancelled",
          paymentStatus: order.paymentStatus,
        });
      }
      if (order.paymentStatus === "paid") {
        return res.status(400).json({
          error: "Paid orders cannot be cancelled here. Please contact support.",
        });
      }
      if (order.status !== "pending") {
        return res.status(400).json({ error: "Order can no longer be cancelled" });
      }
      // Conditional update: never race a concurrent capture/reconciler that
      // just flipped the order to paid.
      const [updated] = await db
        .update(orders)
        .set({
          status: "cancelled",
          paymentFailureReason:
            order.paymentFailureReason ?? "cancelled_by_customer",
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(orders.id, orderId),
            eq(orders.status, "pending"),
            sql`${orders.paymentStatus} <> 'paid'`,
          ),
        )
        .returning();
      if (!updated) {
        return res.status(409).json({
          error: "Order state changed. Please refresh and try again.",
        });
      }
      req.log.info({ orderId: updated.id, userId }, "customer cancelled order");
      return res.json({
        ok: true,
        id: updated.id,
        status: updated.status,
        paymentStatus: updated.paymentStatus,
      });
    } catch (err) {
      req.log.error({ err }, "customer order cancel failed");
      return res.status(500).json({ error: "Failed to cancel order" });
    }
  },
);

// ---- Paymob card payment endpoints --------------------------------------

// Paymob transaction-processed webhook. Public (Paymob's servers call it) but
// authenticated with an HMAC-SHA512 signature over the transaction fields,
// sent as the `hmac` query param. Verified against PAYMOB_HMAC_SECRET before
// anything is trusted. Idempotent: the conditional "not already paid" update
// makes duplicate deliveries and races with the confirm poll / reconciler safe.
router.post("/store/paymob/callback", async (req, res) => {
  try {
    if (!isPaymobConfigured()) {
      return res.status(503).json({ error: "Paymob is not configured" });
    }
    const body = req.body as Record<string, unknown> | undefined;
    const obj =
      body && typeof body.obj === "object" && body.obj !== null
        ? (body.obj as Record<string, unknown>)
        : null;
    if (!obj) {
      return res.status(400).json({ error: "Missing transaction object" });
    }
    const hmac = typeof req.query.hmac === "string" ? req.query.hmac : null;
    if (!verifyPaymobWebhookHmac(obj, hmac)) {
      req.log.warn("paymob callback: invalid HMAC signature");
      return res.status(401).json({ error: "Invalid signature" });
    }

    const paymobOrderId =
      obj.order && typeof obj.order === "object"
        ? String((obj.order as Record<string, unknown>).id ?? "")
        : "";
    if (!paymobOrderId) {
      return res.status(400).json({ error: "Missing order id" });
    }

    const success = obj.success === true || obj.success === "true";
    const pending = obj.pending === true || obj.pending === "true";
    if (pending) {
      // Still pending (3DS in flight) — acknowledge so Paymob stops retrying.
      req.log.info(
        { paymobOrderId },
        "paymob callback: pending transaction ignored",
      );
      return res.json({ ok: true });
    }

    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.paymobOrderId, paymobOrderId));
    if (!order) {
      req.log.warn({ paymobOrderId }, "paymob callback: no matching order");
      // Acknowledge — retrying will never find it either.
      return res.json({ ok: true });
    }

    if (!success) {
      // Definitive decline (success=false, not pending). Mark the payment
      // failed right away so the customer hears immediately instead of
      // waiting for the 48h expiry sweep. markOrderPaymentFailed is a
      // conditional update (only pending/unpaid rows), so duplicate decline
      // callbacks and races with a successful capture are safe: it never
      // touches a paid order and never re-notifies.
      const reason = extractPaymobDeclineReason(obj);
      const failed = await markOrderPaymentFailed(order.id, reason);
      if (failed) {
        req.log.warn(
          { orderId: order.id, paymobOrderId, reason },
          "paymob callback: transaction declined — order marked failed",
        );
        await notifyAdminPaymentFailed(
          failed,
          `رفضت Paymob عملية الدفع (السبب: ${reason}). لن يتم تحصيل أي مبلغ لهذا الطلب.`,
        );
        await notifyCustomerOrderCancelled(failed, "payment_failed", reason);
      } else {
        req.log.info(
          { orderId: order.id, paymobOrderId },
          "paymob callback: decline ignored — order not pending/unpaid",
        );
      }
      return res.json({ ok: true });
    }

    // Amount check: the webhook's amount must match our authoritative EGP
    // total (in cents). A mismatch is suspicious — log and do NOT mark paid.
    const expectedCents = Math.round(Number.parseFloat(order.totalAmount) * 100);
    const receivedCents = Number(obj.amount_cents);
    if (!Number.isFinite(receivedCents) || receivedCents !== expectedCents) {
      req.log.error(
        { orderId: order.id, expectedCents, receivedCents },
        "paymob callback: amount mismatch — not marking paid",
      );
      return res.status(400).json({ error: "Amount mismatch" });
    }

    const transactionId = obj.id !== undefined && obj.id !== null ? String(obj.id) : null;
    const updated = await markPaymobOrderPaid(order.id, transactionId);
    if (updated) {
      req.log.info(
        { orderId: order.id, paymobOrderId, transactionId },
        "paymob callback: order marked paid",
      );
      await sendOrderPaidNotifications(updated);
    }
    return res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "paymob callback failed");
    return res.status(500).json({ error: "Callback processing failed" });
  }
});

// Regenerate a fresh Paymob card-iframe URL for a pending card order (payment
// tokens expire after an hour). Only the owning user may request one.
router.post(
  "/store/orders/:id/paymob-checkout",
  requireAuth,
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.userId!;
      const orderId = Number(req.params.id);
      if (!Number.isFinite(orderId) || orderId <= 0) {
        return res.status(400).json({ error: "Invalid order id" });
      }
      const [order] = await db.select().from(orders).where(eq(orders.id, orderId));
      if (!order || order.userId !== userId) {
        return res.status(404).json({ error: "Order not found" });
      }
      if (order.paymentMethod !== "card" || !order.paymobOrderId) {
        return res.status(400).json({ error: "Order is not a Paymob card order" });
      }
      if (order.paymentStatus === "paid") {
        return res.status(400).json({ error: "Order is already paid" });
      }
      // Pending orders can regenerate freely. A declined (failed) order may
      // be retried too — but never a cancelled or superseded one.
      const retryableFailed =
        order.paymentStatus === "failed" &&
        order.status !== "cancelled" &&
        order.paymentFailureReason !== "superseded_by_new_order";
      if (order.paymentStatus !== "pending" && !retryableFailed) {
        return res.status(400).json({ error: "Order is not awaiting payment" });
      }
      if (retryableFailed) {
        // Reopen the order for a fresh attempt. Conditional so a concurrent
        // paid flip is never overwritten.
        const [reopened] = await db
          .update(orders)
          .set({
            paymentStatus: "pending",
            paymentFailureReason: null,
            updatedAt: new Date(),
          })
          .where(and(eq(orders.id, order.id), eq(orders.paymentStatus, "failed")))
          .returning();
        if (!reopened) {
          return res.status(409).json({
            error: "Order state changed. Please refresh and try again.",
          });
        }
        req.log.info(
          { orderId: order.id },
          "paymob card retry: failed order reopened as pending",
        );
      }
      const checkoutUrl = await createPaymobCheckoutUrlForExistingOrder({
        paymobOrderId: order.paymobOrderId,
        amountEgp: Number.parseFloat(order.totalAmount),
        billing: {
          name: order.fullName,
          email: order.userEmail,
          phone: order.phone,
          city: order.city,
          address: order.address,
        },
      });
      return res.json({ ok: true, checkoutUrl });
    } catch (err) {
      req.log.error({ err }, "paymob checkout url failed");
      return res.status(502).json({ error: "Unable to prepare card checkout. Please try again." });
    }
  },
);

// Restart the mobile-wallet payment for a pending wallet order (payment
// tokens expire after an hour) and return a fresh wallet redirect URL. Only
// the owning user may request one.
router.post(
  "/store/orders/:id/paymob-wallet-checkout",
  requireAuth,
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.userId!;
      const orderId = Number(req.params.id);
      if (!Number.isFinite(orderId) || orderId <= 0) {
        return res.status(400).json({ error: "Invalid order id" });
      }
      const [order] = await db.select().from(orders).where(eq(orders.id, orderId));
      if (!order || order.userId !== userId) {
        return res.status(404).json({ error: "Order not found" });
      }
      if (
        order.paymentMethod !== "wallet" ||
        !order.paymobOrderId ||
        !order.walletPhone
      ) {
        return res.status(400).json({ error: "Order is not a Paymob wallet order" });
      }
      if (order.paymentStatus === "paid") {
        return res.status(400).json({ error: "Order is already paid" });
      }
      // Pending orders can regenerate freely. A declined (failed) order may
      // be retried too — but never a cancelled or superseded one.
      const retryableFailed =
        order.paymentStatus === "failed" &&
        order.status !== "cancelled" &&
        order.paymentFailureReason !== "superseded_by_new_order";
      if (order.paymentStatus !== "pending" && !retryableFailed) {
        return res.status(400).json({ error: "Order is not awaiting payment" });
      }
      if (retryableFailed) {
        // Reopen the order for a fresh attempt. Conditional so a concurrent
        // paid flip is never overwritten.
        const [reopened] = await db
          .update(orders)
          .set({
            paymentStatus: "pending",
            paymentFailureReason: null,
            updatedAt: new Date(),
          })
          .where(and(eq(orders.id, order.id), eq(orders.paymentStatus, "failed")))
          .returning();
        if (!reopened) {
          return res.status(409).json({
            error: "Order state changed. Please refresh and try again.",
          });
        }
        req.log.info(
          { orderId: order.id },
          "paymob wallet retry: failed order reopened as pending",
        );
      }
      const redirectUrl = await createPaymobWalletRedirectForExistingOrder({
        paymobOrderId: order.paymobOrderId,
        amountEgp: Number.parseFloat(order.totalAmount),
        billing: {
          name: order.fullName,
          email: order.userEmail,
          phone: order.phone,
          city: order.city,
          address: order.address,
        },
        walletPhone: order.walletPhone,
      });
      return res.json({ ok: true, redirectUrl });
    } catch (err) {
      req.log.error({ err }, "paymob wallet checkout url failed");
      return res
        .status(502)
        .json({ error: "Unable to prepare wallet checkout. Please try again." });
    }
  },
);

// Confirm a Paymob card payment by live transaction inquiry. Called by the
// pay page (poll + "I've paid" button). Read-only against Paymob — it never
// charges; it only flips our order to paid when Paymob says the transaction
// succeeded. Same idempotent conditional update as the webhook/reconciler.
router.post(
  "/store/orders/:id/paymob-confirm",
  requireAuth,
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.userId!;
      const orderId = Number(req.params.id);
      if (!Number.isFinite(orderId) || orderId <= 0) {
        return res.status(400).json({ error: "Invalid order id" });
      }
      const [order] = await db.select().from(orders).where(eq(orders.id, orderId));
      if (!order || order.userId !== userId) {
        return res.status(404).json({ error: "Order not found" });
      }
      if (
        (order.paymentMethod !== "card" && order.paymentMethod !== "wallet") ||
        !order.paymobOrderId
      ) {
        return res.status(400).json({ error: "Order is not a Paymob order" });
      }
      // Idempotent: already paid (webhook or a previous poll won) → report it.
      if (order.paymentStatus === "paid") {
        return res.json({
          ok: true,
          id: order.id,
          paymentStatus: "paid",
          status: order.status,
        });
      }
      // Declined (webhook or sweep marked it failed) → tell the client so it
      // can show the decline reason instead of leaving the buyer waiting.
      if (order.paymentStatus === "failed") {
        return res.json({
          ok: true,
          id: order.id,
          paymentStatus: "failed",
          status: order.status,
          paymentFailureReason: order.paymentFailureReason,
        });
      }

      const status = await getPaymobTransactionStatus(order.paymobOrderId);
      if (!status) {
        return res.status(502).json({
          error: "Unable to verify payment right now. Please try again shortly.",
        });
      }
      if (!status.found || !status.success || status.pending) {
        return res.json({
          ok: true,
          id: order.id,
          paymentStatus: order.paymentStatus,
          status: order.status,
          paymobStatus: status.found
            ? status.pending
              ? "pending"
              : "not_completed"
            : "no_transaction",
        });
      }

      const updated = await markPaymobOrderPaid(order.id, status.transactionId);
      if (!updated) {
        const [current] = await db.select().from(orders).where(eq(orders.id, order.id));
        return res.json({
          ok: true,
          id: order.id,
          paymentStatus: current?.paymentStatus ?? "paid",
          status: current?.status ?? "confirmed",
        });
      }
      await sendOrderPaidNotifications(updated);
      return res.json({
        ok: true,
        id: updated.id,
        paymentStatus: updated.paymentStatus,
        status: updated.status,
      });
    } catch (err) {
      req.log.error({ err }, "paymob confirm failed");
      return res.status(500).json({ error: "Failed to confirm payment" });
    }
  },
);

router.get("/account/me/orders", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const rows = await db
      .select()
      .from(orders)
      .where(eq(orders.userId, userId))
      .orderBy(desc(orders.createdAt));

    if (rows.length === 0) return res.json({ orders: [] });

    const ids = rows.map((r) => r.id);
    const items = await db.select().from(orderItems).where(inArray(orderItems.orderId, ids));

    const itemsByOrder = new Map<number, OrderItem[]>();
    for (const it of items) {
      const arr = itemsByOrder.get(it.orderId) || [];
      // Strip the raw snapshot URL — the client uses a flag instead.
      arr.push({ ...it, digitalFileUrlSnapshot: it.digitalFileUrlSnapshot ? "__hidden__" : null });
      itemsByOrder.set(it.orderId, arr);
    }

    return res.json({
      orders: rows.map((o) => ({ ...o, items: itemsByOrder.get(o.id) || [] })),
    });
  } catch (err) {
    req.log.error({ err }, "list orders failed");
    return res.status(500).json({ error: "Failed to load orders" });
  }
});

router.get("/account/me/orders/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const id = Number.parseInt(String(req.params.id), 10);
    if (!id || Number.isNaN(id)) return res.status(400).json({ error: "Invalid id" });
    const [order] = await db
      .select()
      .from(orders)
      .where(and(eq(orders.id, id), eq(orders.userId, userId)));
    if (!order) return res.status(404).json({ error: "Not found" });
    const items = await db.select().from(orderItems).where(eq(orderItems.orderId, id));
    return res.json({
      ...order,
      items: items.map((it) => ({
        ...it,
        digitalFileUrlSnapshot: it.digitalFileUrlSnapshot ? "__hidden__" : null,
      })),
    });
  } catch (err) {
    req.log.error({ err }, "get order failed");
    return res.status(500).json({ error: "Failed to load order" });
  }
});

// ---- Digital file delivery --------------------------------------------
//
// Streams the PDF file for a digital item in an order owned by the
// authenticated user. The internal storage path is never exposed to the
// client. When `?download=1` is set the file is sent as an attachment.
router.get(
  "/account/me/orders/:orderId/items/:itemId/file",
  requireAuth,
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.userId!;
      const orderId = Number.parseInt(String(req.params.orderId), 10);
      const itemId = Number.parseInt(String(req.params.itemId), 10);
      if (!Number.isInteger(orderId) || !Number.isInteger(itemId)) {
        return res.status(400).json({ error: "Invalid id" });
      }

      const [order] = await db
        .select()
        .from(orders)
        .where(and(eq(orders.id, orderId), eq(orders.userId, userId)));
      if (!order) return res.status(404).json({ error: "Not found" });
      if (order.status === "cancelled") {
        return res.status(403).json({ error: "Order is cancelled" });
      }
      // Digital PDF access is unlocked only once payment has actually been
      // captured. COD orders never reach paymentStatus=paid, so they can never
      // unlock a PDF.
      if (order.paymentStatus !== "paid") {
        return res.status(403).json({ error: "Payment not completed" });
      }

      const [item] = await db
        .select()
        .from(orderItems)
        .where(and(eq(orderItems.id, itemId), eq(orderItems.orderId, orderId)));
      if (!item) return res.status(404).json({ error: "Item not found" });
      // Defense in depth: only book line items can have a digital PDF.
      // The order-creation route already forces format=null for non-book
      // items, but we re-verify here so a malformed legacy row or any
      // future bypass still cannot resolve a book PDF via a non-book
      // productId.
      if (item.productType !== "book") {
        return res.status(400).json({ error: "Item is not a book" });
      }
      if (item.format !== "digital") {
        return res.status(400).json({ error: "Item is not digital" });
      }

      // Prefer the snapshot taken at purchase. Fall back to the current book
      // record (in case legacy orders predate snapshots).
      let internalUrl = item.digitalFileUrlSnapshot;
      if (!internalUrl) {
        const [b] = await db.select().from(books).where(eq(books.id, item.productId));
        internalUrl = b?.digitalFileUrl ?? null;
      }
      if (!internalUrl || !internalUrl.startsWith("internal://book-pdfs/")) {
        return res.status(404).json({ error: "Digital file not available" });
      }
      const objectId = internalUrl.replace("internal://book-pdfs/", "");
      if (!objectId || objectId.includes("/") || objectId.includes("..")) {
        return res.status(400).json({ error: "Invalid file reference" });
      }

      const relativeKey = `book-pdfs/${objectId}`;
      if (!(await privateObjectExists(relativeKey))) {
        return res.status(404).json({ error: "File not found in storage" });
      }
      const meta = await readPrivateObjectMeta(relativeKey);

      const download = String(req.query.download || "") === "1";
      const safeTitle = (item.productTitle || "book").replace(/[^A-Za-z0-9 _\-\.\u0600-\u06FF]/g, "").slice(0, 80) || "book";
      const filename = `${safeTitle}.pdf`;

      res.setHeader("Content-Type", "application/pdf");
      if (meta?.size) res.setHeader("Content-Length", String(meta.size));
      res.setHeader("Cache-Control", "private, no-store");
      res.setHeader(
        "Content-Disposition",
        `${download ? "attachment" : "inline"}; filename="${filename}"`,
      );

      const stream = openPrivateObjectStream(relativeKey);
      stream.on("error", (err) => {
        req.log.error({ err }, "pdf stream error");
        if (!res.headersSent) res.status(500).end();
      });
      stream.pipe(res);
      return;
    } catch (err) {
      req.log.error({ err }, "deliver pdf failed");
      if (!res.headersSent) res.status(500).json({ error: "Failed to deliver file" });
      return;
    }
  },
);

// HEAD variant of the file delivery route: runs the same authorization
// and existence checks but writes no body, so the reader page can do a
// cheap preflight (instead of a full GET) before embedding the iframe.
router.head(
  "/account/me/orders/:orderId/items/:itemId/file",
  requireAuth,
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.userId!;
      const orderId = Number.parseInt(String(req.params.orderId), 10);
      const itemId = Number.parseInt(String(req.params.itemId), 10);
      if (!Number.isInteger(orderId) || !Number.isInteger(itemId)) {
        return res.status(400).end();
      }

      const [order] = await db
        .select()
        .from(orders)
        .where(and(eq(orders.id, orderId), eq(orders.userId, userId)));
      if (!order) return res.status(404).end();
      if (order.status === "cancelled") return res.status(403).end();
      if (order.paymentStatus !== "paid") return res.status(403).end();

      const [item] = await db
        .select()
        .from(orderItems)
        .where(and(eq(orderItems.id, itemId), eq(orderItems.orderId, orderId)));
      if (!item) return res.status(404).end();
      // Defense in depth: only book line items can have a digital PDF.
      if (item.productType !== "book") return res.status(400).end();
      if (item.format !== "digital") return res.status(400).end();

      let internalUrl = item.digitalFileUrlSnapshot;
      if (!internalUrl) {
        const [b] = await db.select().from(books).where(eq(books.id, item.productId));
        internalUrl = b?.digitalFileUrl ?? null;
      }
      if (!internalUrl || !internalUrl.startsWith("internal://book-pdfs/")) {
        return res.status(404).end();
      }
      const objectId = internalUrl.replace("internal://book-pdfs/", "");
      if (!objectId || objectId.includes("/") || objectId.includes("..")) {
        return res.status(400).end();
      }

      const relativeKey = `book-pdfs/${objectId}`;
      if (!(await privateObjectExists(relativeKey))) return res.status(404).end();

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Cache-Control", "private, no-store");
      return res.status(200).end();
    } catch (err) {
      req.log.error({ err }, "head pdf failed");
      if (!res.headersSent) return res.status(500).end();
      return;
    }
  },
);

// ---- Admin endpoints ---------------------------------------------------

// Manually trigger a PayPal reconciliation pass. Useful for verification and
// for clearing a backlog without waiting for the scheduled job. Idempotent and
// safe to run repeatedly; never double-charges.
router.post("/admin/orders/reconcile-paypal", requireAdmin, async (req, res) => {
  try {
    const summary = await reconcilePendingPayPalOrders({ minAgeMs: 0 });
    return res.json({ ok: true, ...summary });
  } catch (err) {
    req.log.error({ err }, "manual paypal reconcile failed");
    return res.status(500).json({ error: "Reconciliation failed" });
  }
});

// Manually trigger a Paymob reconciliation pass (same semantics as the PayPal
// one): flips any pending card order whose Paymob transaction succeeded.
router.post("/admin/orders/reconcile-paymob", requireAdmin, async (req, res) => {
  try {
    const summary = await reconcilePendingPaymobOrders({ minAgeMs: 0 });
    return res.json({ ok: true, ...summary });
  } catch (err) {
    req.log.error({ err }, "manual paymob reconcile failed");
    return res.status(500).json({ error: "Reconciliation failed" });
  }
});

// One-click "clean up stuck orders": first rescue any actually-paid pending
// orders via both reconcilers, then cancel stale abandoned online-payment
// orders. The manual action uses a 1-hour grace (vs the sweep's 48h) so an
// admin can clear obvious junk immediately without touching checkouts that
// are genuinely in flight. COD orders are never touched.
router.post("/admin/orders/cleanup-stuck", requireAdmin, async (req, res) => {
  try {
    const paypal = await reconcilePendingPayPalOrders({ minAgeMs: 0 });
    const paymob = await reconcilePendingPaymobOrders({ minAgeMs: 0 });
    const expired = await expireStalePendingOrders({ maxAgeMs: 60 * 60 * 1000 });
    req.log.info({ paypal, paymob, expired }, "admin cleanup-stuck completed");
    return res.json({ ok: true, paypal, paymob, expired });
  } catch (err) {
    req.log.error({ err }, "admin cleanup-stuck failed");
    return res.status(500).json({ error: "Cleanup failed" });
  }
});

router.get("/admin/orders", requireAdmin, async (_req, res) => {
  try {
    const rows = await db.select().from(orders).orderBy(desc(orders.createdAt));
    return res.json(rows);
  } catch {
    return res.status(500).json({ error: "Failed" });
  }
});

router.get("/admin/orders/:id", requireAdmin, async (req, res) => {
  try {
    const id = Number.parseInt(String(req.params.id), 10);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: "Invalid id" });
    }
    const [order] = await db.select().from(orders).where(eq(orders.id, id));
    if (!order) return res.status(404).json({ error: "Not found" });
    const items = await db.select().from(orderItems).where(eq(orderItems.orderId, id));
    return res.json({ ...order, items });
  } catch {
    return res.status(500).json({ error: "Failed" });
  }
});

router.put("/admin/orders/:id", requireAdmin, async (req, res) => {
  try {
    const id = Number.parseInt(String(req.params.id), 10);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: "Invalid id" });
    }
    const body = req.body as Record<string, unknown>;
    const updates: Partial<Order> = { updatedAt: new Date() };
    if (body.status !== undefined) {
      const s = String(body.status);
      if (!["pending", "confirmed", "processing", "completed", "cancelled"].includes(s)) {
        return res.status(400).json({ error: "Invalid status" });
      }
      updates.status = s as Order["status"];
    }
    if (body.adminNote !== undefined) {
      updates.adminNote = body.adminNote ? String(body.adminNote).slice(0, 2000) : null;
    }
    // Detect an actual status change so we only email the customer when the
    // order's status really moved (not on note-only edits or no-op saves).
    const [before] = await db.select().from(orders).where(eq(orders.id, id));
    const [updated] = await db.update(orders).set(updates).where(eq(orders.id, id)).returning();
    if (!updated) return res.status(404).json({ error: "Not found" });

    if (
      updates.status !== undefined &&
      before &&
      before.status !== updated.status &&
      updated.userEmail
    ) {
      try {
        await sendOrderStatusUpdate({
          to: updated.userEmail,
          orderId: updated.id,
          customerName: updated.fullName,
          status: updated.status,
          adminNote: updated.adminNote,
        });
      } catch (emailErr) {
        req.log.error(
          { err: emailErr, orderId: updated.id },
          "order status update email failed",
        );
      }
    }

    return res.json(updated);
  } catch {
    return res.status(500).json({ error: "Failed" });
  }
});

export default router;
