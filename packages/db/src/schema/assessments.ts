import { integer, jsonb, pgEnum, pgTable, serial, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { clients } from "./clients.js";
import { tenants } from "./tenants.js";

export const assessmentServiceEnum = pgEnum("assessment_service_type", [
  "management",
  "sharia",
  "digital",
  "full",
]);

export const assessments = pgTable("assessments", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").references(() => tenants.id, { onDelete: "cascade" }),
  clientId: integer("client_id").references(() => clients.id, { onDelete: "set null" }),
  serviceType: assessmentServiceEnum("service_type").notNull(),
  answers: jsonb("answers").notNull(),
  reportContent: text("report_content"),
  executiveSummary: text("executive_summary"),
  scores: jsonb("scores"),
  status: varchar("status", { length: 50 }).notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Assessment = typeof assessments.$inferSelect;
export type NewAssessment = typeof assessments.$inferInsert;
