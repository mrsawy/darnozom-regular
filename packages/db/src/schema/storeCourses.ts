import { boolean, integer, pgEnum, pgTable, serial, text, timestamp, varchar } from "drizzle-orm/pg-core";

export const courseDeliveryEnum = pgEnum("course_delivery", ["online_self", "online_live", "onsite", "hybrid"]);
export const courseLevelEnum = pgEnum("course_level", ["beginner", "intermediate", "advanced", "all_levels"]);
export const courseLanguageEnum = pgEnum("course_language", ["ar", "en", "both"]);
export const courseStatusEnum = pgEnum("course_status", ["available", "coming_soon", "archived"]);

export const storeCourses = pgTable("store_courses", {
  id: serial("id").primaryKey(),
  titleAr: varchar("title_ar", { length: 500 }).notNull(),
  titleEn: varchar("title_en", { length: 500 }),
  descriptionAr: text("description_ar"),
  descriptionEn: text("description_en"),
  instructor: varchar("instructor", { length: 255 }),
  thumbnailUrl: text("thumbnail_url"),
  category: varchar("category", { length: 100 }).default("management"),
  delivery: courseDeliveryEnum("delivery").notNull().default("online_self"),
  level: courseLevelEnum("level").notNull().default("all_levels"),
  language: courseLanguageEnum("language").notNull().default("ar"),
  durationHours: integer("duration_hours"),
  modules: integer("modules"),
  certification: boolean("certification").notNull().default(false),
  upcomingDate: varchar("upcoming_date", { length: 100 }),
  location: varchar("location", { length: 255 }),
  price: varchar("price", { length: 50 }),
  currency: varchar("currency", { length: 10 }).default("SAR"),
  status: courseStatusEnum("status").notNull().default("available"),
  isFeatured: boolean("is_featured").notNull().default(false),
  isNewRelease: boolean("is_new_release").notNull().default(false),
  syllabusUrl: text("syllabus_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type StoreCourse = typeof storeCourses.$inferSelect;
export type NewStoreCourse = typeof storeCourses.$inferInsert;
