import { integer, pgEnum, pgTable, serial, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { clients } from "./clients.js";
import { reports } from "./reports.js";

export const whatsappMethodEnum = pgEnum("whatsapp_method", ["manual", "auto"]);

export const whatsappDeliveryLogs = pgTable("whatsapp_delivery_logs", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").references(() => clients.id, { onDelete: "set null" }),
  reportId: integer("report_id").references(() => reports.id, { onDelete: "set null" }),
  assessmentId: integer("assessment_id"),
  recipient: varchar("recipient", { length: 100 }).notNull(),
  method: whatsappMethodEnum("method").notNull().default("manual"),
  sentAt: timestamp("sent_at").defaultNow().notNull(),
  note: text("note"),
});

export type WhatsappDeliveryLog = typeof whatsappDeliveryLogs.$inferSelect;
export type NewWhatsappDeliveryLog = typeof whatsappDeliveryLogs.$inferInsert;
