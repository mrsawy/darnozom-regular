import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";

export const contentTypeEnum = pgEnum("content_type", [
  "observatory",
  "article",
  "study",
  "publication",
  "news",
  "event",
]);
export const contentStatusEnum = pgEnum("content_status", ["draft", "review", "published", "archived"]);
export const featuredSourceEnum = pgEnum("featured_source", ["content", "book", "custom"]);

export const contentAreas = pgTable(
  "content_areas",
  {
    id: serial("id").primaryKey(),
    slug: varchar("slug", { length: 64 }).notNull(),
    labelAr: varchar("label_ar", { length: 200 }).notNull(),
    labelEn: varchar("label_en", { length: 200 }).notNull().default(""),
    position: integer("position").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [uniqueIndex("content_areas_slug_uq").on(t.slug)],
);

export const contentItems = pgTable(
  "content_items",
  {
    id: serial("id").primaryKey(),
    type: contentTypeEnum("type").notNull(),
    slug: varchar("slug", { length: 200 }).notNull(),
    status: contentStatusEnum("status").notNull().default("draft"),
    titleAr: varchar("title_ar", { length: 500 }).notNull(),
    titleEn: varchar("title_en", { length: 500 }).notNull().default(""),
    summaryAr: text("summary_ar").notNull().default(""),
    summaryEn: text("summary_en").notNull().default(""),
    bodyAr: text("body_ar").notNull().default(""),
    bodyEn: text("body_en").notNull().default(""),
    coverImageUrl: varchar("cover_image_url", { length: 1000 }).notNull().default(""),
    // Slug of a row in content_areas (admin-managed). Not an FK so an area can never block/cascade content.
    area: varchar("area", { length: 64 }),
    authorAr: varchar("author_ar", { length: 300 }).notNull().default(""),
    authorEn: varchar("author_en", { length: 300 }).notNull().default(""),
    isExternal: boolean("is_external").notNull().default(false),
    externalUrl: varchar("external_url", { length: 1000 }).notNull().default(""),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    // Set once subscribers have been emailed about this item (newsletter). Guards against double sends.
    notifiedAt: timestamp("notified_at", { withTimezone: true }),
    notifiedCount: integer("notified_count"),
    details: jsonb("details").$type<Record<string, unknown>>().notNull().default({}),
    // Per-item engagement switches (admin-controlled) and denormalised counters.
    // Likes/comments live in their own tables; views/shares are plain counters.
    likesEnabled: boolean("likes_enabled").notNull().default(true),
    commentsEnabled: boolean("comments_enabled").notNull().default(true),
    viewCount: integer("view_count").notNull().default(0),
    shareCount: integer("share_count").notNull().default(0),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("content_items_slug_uq").on(t.slug),
    index("content_items_listing_idx").on(t.type, t.status, t.publishedAt),
  ],
);

/** One like per signed-in user per item. */
export const contentLikes = pgTable(
  "content_likes",
  {
    id: serial("id").primaryKey(),
    contentItemId: integer("content_item_id")
      .notNull()
      .references(() => contentItems.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [uniqueIndex("content_likes_item_user_uq").on(t.contentItemId, t.userId)],
);

export const commentStatusEnum = pgEnum("content_comment_status", ["visible", "hidden"]);

export const contentComments = pgTable(
  "content_comments",
  {
    id: serial("id").primaryKey(),
    contentItemId: integer("content_item_id")
      .notNull()
      .references(() => contentItems.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull(),
    authorName: varchar("author_name", { length: 200 }).notNull(),
    body: text("body").notNull(),
    isGuest: boolean("is_guest").notNull().default(false),
    status: commentStatusEnum("status").notNull().default("visible"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [index("content_comments_item_idx").on(t.contentItemId, t.status, t.createdAt)],
);

export const featuredSlides = pgTable("featured_slides", {
  id: serial("id").primaryKey(),
  position: integer("position").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  sourceKind: featuredSourceEnum("source_kind").notNull(),
  contentItemId: integer("content_item_id").references(() => contentItems.id, { onDelete: "set null" }),
  medusaProductId: varchar("medusa_product_id", { length: 100 }),
  badgeAr: varchar("badge_ar", { length: 100 }).notNull().default(""),
  badgeEn: varchar("badge_en", { length: 100 }).notNull().default(""),
  titleAr: varchar("title_ar", { length: 500 }).notNull().default(""),
  titleEn: varchar("title_en", { length: 500 }).notNull().default(""),
  summaryAr: text("summary_ar").notNull().default(""),
  summaryEn: text("summary_en").notNull().default(""),
  imageUrl: varchar("image_url", { length: 1000 }).notNull().default(""),
  ctaLabelAr: varchar("cta_label_ar", { length: 100 }).notNull().default(""),
  ctaLabelEn: varchar("cta_label_en", { length: 100 }).notNull().default(""),
  href: varchar("href", { length: 1000 }).notNull().default(""),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type ContentAreaRow = typeof contentAreas.$inferSelect;
export type ContentItem = typeof contentItems.$inferSelect;
export type NewContentItem = typeof contentItems.$inferInsert;
export type FeaturedSlide = typeof featuredSlides.$inferSelect;
export type NewFeaturedSlide = typeof featuredSlides.$inferInsert;
export type ContentComment = typeof contentComments.$inferSelect;
