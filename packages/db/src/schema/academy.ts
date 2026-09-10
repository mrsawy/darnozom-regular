import { integer, pgTable, serial, text, timestamp, varchar, decimal } from "drizzle-orm/pg-core";

export const academyCourses = pgTable("academy_courses", {
  id: serial("id").primaryKey(),
  titleAr: varchar("title_ar", { length: 500 }).notNull(),
  titleEn: varchar("title_en", { length: 500 }).notNull(),
  descriptionAr: text("description_ar"),
  descriptionEn: text("description_en"),
  track: varchar("track", { length: 100 }),
  level: varchar("level", { length: 100 }),
  duration: varchar("duration", { length: 100 }),
  seats: integer("seats").notNull().default(0),
  price: varchar("price", { length: 50 }),
  startDate: varchar("start_date", { length: 50 }),
  imageUrl: varchar("image_url", { length: 1000 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const courseRegistrations = pgTable("course_registrations", {
  id: serial("id").primaryKey(),
  courseId: integer("course_id").notNull().references(() => academyCourses.id),
  fullName: varchar("full_name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 50 }).notNull(),
  organization: varchar("organization", { length: 255 }),
  registeredAt: timestamp("registered_at").defaultNow().notNull(),
});

export const academyAnnouncements = pgTable("academy_announcements", {
  id: serial("id").primaryKey(),
  titleAr: varchar("title_ar", { length: 500 }).notNull(),
  titleEn: varchar("title_en", { length: 500 }).notNull(),
  descriptionAr: text("description_ar"),
  descriptionEn: text("description_en"),
  price: varchar("price", { length: 100 }),
  startDate: varchar("start_date", { length: 100 }),
  imageUrl: varchar("image_url", { length: 1000 }),
  registrationUrl: varchar("registration_url", { length: 1000 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const academyApplications = pgTable("academy_applications", {
  id: serial("id").primaryKey(),
  applyType: varchar("apply_type", { length: 50 }).notNull(),
  programId: varchar("program_id", { length: 100 }),
  levelCode: varchar("level_code", { length: 50 }),
  diplomaId: varchar("diploma_id", { length: 100 }),
  courseId: varchar("course_id", { length: 100 }),
  execProgramId: varchar("exec_program_id", { length: 100 }),
  contextLabelAr: varchar("context_label_ar", { length: 500 }),
  contextLabelEn: varchar("context_label_en", { length: 500 }),
  fullName: varchar("full_name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 50 }).notNull(),
  organization: varchar("organization", { length: 255 }),
  country: varchar("country", { length: 100 }),
  notes: text("notes"),
  status: varchar("status", { length: 30 }).notNull().default("new"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type AcademyCourse = typeof academyCourses.$inferSelect;
export type NewAcademyCourse = typeof academyCourses.$inferInsert;
export type CourseRegistration = typeof courseRegistrations.$inferSelect;
export type NewCourseRegistration = typeof courseRegistrations.$inferInsert;
export type AcademyAnnouncement = typeof academyAnnouncements.$inferSelect;
export type NewAcademyAnnouncement = typeof academyAnnouncements.$inferInsert;
export type AcademyApplication = typeof academyApplications.$inferSelect;
export type NewAcademyApplication = typeof academyApplications.$inferInsert;
