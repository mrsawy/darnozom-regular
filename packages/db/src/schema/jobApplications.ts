import { integer, pgEnum, pgTable, serial, text, timestamp, varchar } from "drizzle-orm/pg-core";

export const jobApplicationStatusEnum = pgEnum("job_application_status", [
  "new",
  "reviewing",
  "accepted",
  "rejected",
]);

export const jobApplications = pgTable("job_applications", {
  id: serial("id").primaryKey(),
  jobId: integer("job_id").notNull(),
  jobTitleAr: varchar("job_title_ar", { length: 500 }).notNull(),
  jobTitleEn: varchar("job_title_en", { length: 500 }).notNull(),
  fullName: varchar("full_name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 50 }).notNull(),
  yearsExperience: integer("years_experience"),
  coverLetter: text("cover_letter"),
  resumePath: varchar("resume_path", { length: 1000 }).notNull(),
  resumeFileName: varchar("resume_file_name", { length: 500 }).notNull(),
  resumeMimeType: varchar("resume_mime_type", { length: 200 }).notNull(),
  resumeSize: integer("resume_size").notNull(),
  status: jobApplicationStatusEnum("status").notNull().default("new"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type JobApplication = typeof jobApplications.$inferSelect;
export type NewJobApplication = typeof jobApplications.$inferInsert;
