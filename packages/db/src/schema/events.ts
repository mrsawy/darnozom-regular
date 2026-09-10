import { pgEnum, pgTable, serial, text, timestamp, varchar } from "drizzle-orm/pg-core";

export const eventStatusEnum = pgEnum("event_status", ["upcoming", "past"]);

export const events = pgTable("events", {
  id: serial("id").primaryKey(),
  titleAr: varchar("title_ar", { length: 500 }).notNull(),
  titleEn: varchar("title_en", { length: 500 }).notNull(),
  dateAr: varchar("date_ar", { length: 200 }).notNull(),
  dateEn: varchar("date_en", { length: 200 }).notNull(),
  timeAr: varchar("time_ar", { length: 200 }),
  timeEn: varchar("time_en", { length: 200 }),
  locationAr: varchar("location_ar", { length: 500 }),
  locationEn: varchar("location_en", { length: 500 }),
  categoryAr: varchar("category_ar", { length: 200 }),
  categoryEn: varchar("category_en", { length: 200 }),
  descriptionAr: text("description_ar"),
  descriptionEn: text("description_en"),
  imageUrl: varchar("image_url", { length: 1000 }),
  status: eventStatusEnum("status").notNull().default("upcoming"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Event = typeof events.$inferSelect;
export type NewEvent = typeof events.$inferInsert;
