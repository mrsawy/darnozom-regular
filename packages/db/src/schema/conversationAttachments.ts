import { integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

import { conversations } from "./conversations";

export const conversationAttachments = pgTable("conversation_attachments", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id")
    .notNull()
    .references(() => conversations.id, { onDelete: "cascade" }),
  fileName: text("file_name").notNull(),
  contentType: text("content_type").notNull(),
  fileSize: integer("file_size").notNull(),
  objectPath: text("object_path").notNull(),
  extractedText: text("extracted_text"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertConversationAttachmentSchema = createInsertSchema(conversationAttachments).omit({
  id: true,
  createdAt: true,
});

export type ConversationAttachment = typeof conversationAttachments.$inferSelect;
export type InsertConversationAttachment = z.infer<typeof insertConversationAttachmentSchema>;
