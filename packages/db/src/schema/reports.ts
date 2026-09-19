import { integer, jsonb, pgEnum, pgTable, serial, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { clients } from "./clients.js";

export const reportTypeEnum = pgEnum("report_type", ["strategy", "governance", "sharia", "combined"]);

export const reports = pgTable("reports", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 500 }).notNull(),
  reportType: reportTypeEnum("report_type").notNull(),
  content: text("content").notNull(),
  executiveSummary: text("executive_summary"),
  mappedIntake: jsonb("mapped_intake"),
  draftId: varchar("draft_id", { length: 64 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Report = typeof reports.$inferSelect;
export type NewReport = typeof reports.$inferInsert;

export const reportAttachments = pgTable("report_attachments", {
  id: serial("id").primaryKey(),
  reportId: integer("report_id").references(() => reports.id, { onDelete: "cascade" }),
  draftId: varchar("draft_id", { length: 64 }),
  tenantId: integer("tenant_id"),
  fileName: varchar("file_name", { length: 500 }).notNull(),
  contentType: varchar("content_type", { length: 200 }),
  fileSize: integer("file_size"),
  objectPath: text("object_path").notNull(),
  extractedText: text("extracted_text"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type ReportAttachment = typeof reportAttachments.$inferSelect;
export type NewReportAttachment = typeof reportAttachments.$inferInsert;
