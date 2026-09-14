import {
  integer,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

export const orderStatusEnum = pgEnum("order_status", [
  "pending",
  "confirmed",
  "processing",
  "completed",
  "cancelled",
]);

export const orderItemTypeEnum = pgEnum("order_item_type", ["book", "course", "app"]);

export const orderItemFormatEnum = pgEnum("order_item_format", ["paper", "digital"]);

export const paymentMethodEnum = pgEnum("payment_method", [
  "paypal",
  "card",
  "wallet",
  "cash_on_delivery",
]);

export const paymentStatusEnum = pgEnum("payment_status", [
  "unpaid",
  "pending",
  "paid",
  "failed",
]);

export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id", { length: 255 }).notNull(),
  userEmail: varchar("user_email", { length: 255 }).notNull(),
  fullName: varchar("full_name", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 50 }).notNull(),
  address: text("address"),
  city: varchar("city", { length: 120 }),
  notes: text("notes"),
  totalAmount: varchar("total_amount", { length: 50 }).notNull().default("0"),
  shippingTotal: varchar("shipping_total", { length: 50 }).notNull().default("0"),
  shippingCity: varchar("shipping_city", { length: 200 }),
  currency: varchar("currency", { length: 10 }).notNull().default("EGP"),
  itemsCount: integer("items_count").notNull().default(0),
  status: orderStatusEnum("status").notNull().default("pending"),
  paymentMethod: paymentMethodEnum("payment_method").notNull().default("cash_on_delivery"),
  paymentStatus: paymentStatusEnum("payment_status").notNull().default("unpaid"),
  paypalOrderId: varchar("paypal_order_id", { length: 255 }),
  paypalCaptureId: varchar("paypal_capture_id", { length: 255 }),
  // Paymob (card payments): the Paymob order id created for this order and
  // the successful transaction id once the card charge completes. Card orders
  // are charged in EGP directly (no USD conversion).
  paymobOrderId: varchar("paymob_order_id", { length: 255 }),
  paymobTransactionId: varchar("paymob_transaction_id", { length: 255 }),
  // Mobile-wallet payments (Vodafone Cash / Orange Money / Etisalat Cash via
  // Paymob): the wallet phone number the buyer pays from. Needed to
  // regenerate the wallet payment redirect when the token expires.
  walletPhone: varchar("wallet_phone", { length: 50 }),
  // USD amount actually charged via PayPal (EGP total converted server-side).
  usdAmount: varchar("usd_amount", { length: 50 }),
  // EGP→USD rate used at payment time (audit trail; never trust client amount).
  exchangeRate: varchar("exchange_rate", { length: 50 }),
  paidAt: timestamp("paid_at"),
  // Why the payment terminally failed (e.g. the PayPal issue code
  // COMPLIANCE_VIOLATION, or "expired" for stale pending orders auto-cancelled
  // by the sweep). Set together with paymentStatus = "failed" so admins and
  // the customer's account page can show the reason; null for non-failed
  // orders.
  paymentFailureReason: varchar("payment_failure_reason", { length: 500 }),
  // Set only when the background reconciler (not the live browser flow)
  // flipped this order to paid — used to show a "payment recovered" note.
  paymentRecoveredAt: timestamp("payment_recovered_at"),
  // Live tracking, set by an admin once the order ships. trackingUrl is
  // shown to the customer as a "Track your order" link; trackingCarrier is
  // a free-text label (e.g. "Aramex"). shippedAt is stamped automatically
  // the first time trackingUrl is set.
  trackingUrl: text("tracking_url"),
  trackingCarrier: varchar("tracking_carrier", { length: 100 }),
  shippedAt: timestamp("shipped_at"),
  adminNote: text("admin_note"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  productType: orderItemTypeEnum("product_type").notNull(),
  productId: integer("product_id").notNull(),
  productTitle: varchar("product_title", { length: 500 }).notNull(),
  imageUrl: varchar("image_url", { length: 1000 }),
  quantity: integer("quantity").notNull().default(1),
  unitPrice: varchar("unit_price", { length: 50 }).notNull().default("0"),
  currency: varchar("currency", { length: 10 }).notNull().default("EGP"),
  format: orderItemFormatEnum("format"),
  digitalFileUrlSnapshot: text("digital_file_url_snapshot"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;
export type OrderItem = typeof orderItems.$inferSelect;
export type NewOrderItem = typeof orderItems.$inferInsert;
