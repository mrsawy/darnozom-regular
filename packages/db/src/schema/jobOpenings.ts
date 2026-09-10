import { boolean, date, pgEnum, pgTable, serial, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const jobOpeningStatusEnum = pgEnum("job_opening_status", ["active", "archived"]);

export const jobOpenings = pgTable("job_openings", {
  id: serial("id").primaryKey(),
  titleAr: varchar("title_ar", { length: 500 }).notNull(),
  titleEn: varchar("title_en", { length: 500 }).notNull(),
  deptAr: varchar("dept_ar", { length: 200 }).notNull(),
  deptEn: varchar("dept_en", { length: 200 }).notNull(),
  locationAr: varchar("location_ar", { length: 300 }).notNull(),
  locationEn: varchar("location_en", { length: 300 }).notNull(),
  type: varchar("type", { length: 50 }).notNull(),
  typeAr: varchar("type_ar", { length: 100 }).notNull(),
  typeEn: varchar("type_en", { length: 100 }).notNull(),
  posted: date("posted", { mode: "string" }).notNull(),
  remote: boolean("remote").notNull().default(false),
  descAr: text("desc_ar").notNull().default(""),
  descEn: text("desc_en").notNull().default(""),
  skillsAr: text("skills_ar").array().notNull().default(sql`ARRAY[]::text[]`),
  skillsEn: text("skills_en").array().notNull().default(sql`ARRAY[]::text[]`),
  category: varchar("category", { length: 100 }).notNull(),
  status: jobOpeningStatusEnum("status").notNull().default("active"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type JobOpening = typeof jobOpenings.$inferSelect;
export type NewJobOpening = typeof jobOpenings.$inferInsert;
