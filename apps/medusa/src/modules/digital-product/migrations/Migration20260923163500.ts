import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260923163500 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "digital_book_file" ("id" text not null, "variant_id" text not null, "title" text not null, "file_name" text not null, "relative_key" text not null, "mime_type" text not null, "size" integer not null, "sort_order" integer not null default 0, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "digital_book_file_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_digital_book_file_deleted_at" ON "digital_book_file" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_digital_book_file_variant_id" ON "digital_book_file" ("variant_id") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "digital_book_file" cascade;`);
  }

}
