import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260924180356 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "book_profile" drop constraint if exists "book_profile_external_id_unique";`);
    this.addSql(`alter table if exists "book_profile" drop constraint if exists "book_profile_isbn_unique";`);
    this.addSql(`alter table if exists "book_profile" drop constraint if exists "book_profile_product_id_unique";`);
    this.addSql(`create table if not exists "book_profile" ("id" text not null, "product_id" text not null, "authors" jsonb null, "editors" jsonb null, "translators" jsonb null, "publisher" text null, "isbn" text null, "external_id" text null, "publication_year" integer null, "edition_number" integer null, "pages" integer null, "volumes" integer not null default 1, "language" text check ("language" in ('ar', 'en', 'both')) not null default 'ar', "primary_category_id" text null, "keywords" jsonb null, "target_audience" text null, "table_of_contents" text null, "digital_rights" boolean not null default false, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "book_profile_pkey" primary key ("id"));`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_book_profile_product_id_unique" ON "book_profile" ("product_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_book_profile_deleted_at" ON "book_profile" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_book_profile_isbn_unique" ON "book_profile" ("isbn") WHERE isbn IS NOT NULL AND deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_book_profile_external_id_unique" ON "book_profile" ("external_id") WHERE external_id IS NOT NULL AND deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "book_profile" cascade;`);
  }

}
