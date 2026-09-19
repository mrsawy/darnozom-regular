import { integer, pgTable, serial, text, timestamp, boolean } from "drizzle-orm/pg-core";
import { assessments } from "./assessments.js";

export const proposals = pgTable("proposals", {
  id: serial("id").primaryKey(),
  assessmentId: integer("assessment_id").notNull().references(() => assessments.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  editedContent: text("edited_content"),
  sharedWithClient: boolean("shared_with_client").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Proposal = typeof proposals.$inferSelect;
export type NewProposal = typeof proposals.$inferInsert;
