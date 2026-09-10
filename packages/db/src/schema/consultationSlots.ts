import { integer, pgEnum, pgTable, serial, text, timestamp, varchar } from "drizzle-orm/pg-core";

export const consultationSlotStatusEnum = pgEnum("consultation_slot_status", [
  "available",
  "booked",
  "disabled",
]);

export const consultationSlots = pgTable("consultation_slots", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id"),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  durationMinutes: integer("duration_minutes").notNull().default(60),
  consultationType: varchar("consultation_type", { length: 150 }),
  notes: text("notes"),
  status: consultationSlotStatusEnum("status").notNull().default("available"),
  createdBy: varchar("created_by", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type ConsultationSlot = typeof consultationSlots.$inferSelect;
export type NewConsultationSlot = typeof consultationSlots.$inferInsert;
