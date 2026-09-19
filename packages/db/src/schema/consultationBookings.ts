import { integer, pgEnum, pgTable, serial, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { consultationSlots } from "./consultationSlots.js";

export const consultationBookingStatusEnum = pgEnum("consultation_booking_status", [
  "confirmed",
  "cancelled",
  "completed",
]);

export const consultationBookings = pgTable("consultation_bookings", {
  id: serial("id").primaryKey(),
  slotId: integer("slot_id")
    .notNull()
    .references(() => consultationSlots.id, { onDelete: "cascade" }),
  clientName: varchar("client_name", { length: 255 }).notNull(),
  clientEmail: varchar("client_email", { length: 255 }).notNull(),
  clientPhone: varchar("client_phone", { length: 100 }),
  consultationType: varchar("consultation_type", { length: 150 }),
  notes: text("notes"),
  status: consultationBookingStatusEnum("status").notNull().default("confirmed"),
  googleEventId: varchar("google_event_id", { length: 255 }),
  googleEventHtmlLink: text("google_event_html_link"),
  googleMeetLink: text("google_meet_link"),
  calendarSyncError: text("calendar_sync_error"),
  userId: varchar("user_id", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type ConsultationBooking = typeof consultationBookings.$inferSelect;
export type NewConsultationBooking = typeof consultationBookings.$inferInsert;
