import { pgTable, serial, text, varchar, timestamp, boolean } from "drizzle-orm/pg-core";

export const rfpSubmissions = pgTable("rfp_submissions", {
  id: serial("id").primaryKey(),
  fullName: varchar("full_name", { length: 255 }).notNull(),
  jobTitle: varchar("job_title", { length: 255 }),
  organization: varchar("organization", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 50 }),
  servicesOfInterest: text("services_of_interest").array().notNull(),
  projectDescription: text("project_description").notNull(),
  desiredStartDate: varchar("desired_start_date", { length: 100 }),
  estimatedBudget: varchar("estimated_budget", { length: 100 }),
  projectDuration: varchar("project_duration", { length: 100 }),
  howDidYouHear: varchar("how_did_you_hear", { length: 100 }),
  attachmentUrl: text("attachment_url"),
  attachmentName: varchar("attachment_name", { length: 255 }),
  submissionType: varchar("submission_type", { length: 50 }).default("rfp").notNull(),
  country: varchar("country", { length: 100 }),
  status: varchar("status", { length: 50 }).default("new").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type RfpSubmission = typeof rfpSubmissions.$inferSelect;
export type NewRfpSubmission = typeof rfpSubmissions.$inferInsert;
