import { db, orderItems, type Order } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "./logger";
import { sendAdminSalesNotification, sendOrderReceipt } from "./email";

// Shared post-payment notifications for an order that just became paid:
//   1. the customer's Arabic receipt email (with digital read/download links)
//   2. the admin "sale complete" notification
// Used by both the live capture route and the background reconciler so a
// recovered payment produces exactly the same confirmation email as a normal
// capture. Best-effort: failures are logged and never thrown.
export async function sendOrderPaidNotifications(order: Order): Promise<void> {
  try {
    const receiptItems = await db
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, order.id));
    const subtotal = (
      parseFloat(order.totalAmount || "0") - parseFloat(order.shippingTotal || "0")
    ).toFixed(2);

    const result = await sendOrderReceipt({
      to: order.userEmail,
      orderId: order.id,
      customerName: order.fullName,
      currency: order.currency,
      subtotal,
      shippingTotal: order.shippingTotal,
      totalAmount: order.totalAmount,
      items: receiptItems.map((it) => ({
        id: it.id,
        productTitle: it.productTitle,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        format: it.format,
        isDigital: it.format === "digital" && !!it.digitalFileUrlSnapshot,
      })),
    });
    if (!result.ok) {
      logger.warn(
        { orderId: order.id, error: result.error },
        "order receipt email not sent",
      );
    }

    if (
      order.paymentMethod === "paypal" ||
      order.paymentMethod === "card" ||
      order.paymentMethod === "wallet" ||
      order.paymentMethod === "cash_on_delivery"
    ) {
      await sendAdminSalesNotification({
        orderId: order.id,
        stage: "complete",
        paymentMethod: order.paymentMethod,
        customerName: order.fullName,
        customerEmail: order.userEmail,
        phone: order.phone,
        currency: order.currency,
        totalAmount: order.totalAmount,
        city: order.shippingCity,
        address: order.address,
        items: receiptItems.map((it) => ({
          productTitle: it.productTitle,
          quantity: it.quantity,
          format: it.format,
        })),
      });
    }
  } catch (err) {
    logger.error({ err, orderId: order.id }, "order paid notifications failed");
  }
}
