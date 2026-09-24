import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260923132401 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "manual_payment_method" drop constraint if exists "manual_payment_method_code_unique";`);
    this.addSql(`create table if not exists "manual_payment_method" ("id" text not null, "code" text not null, "account_number" text null, "account_name" text null, "whatsapp_number" text null, "instapay_address" text null, "qr_image_url" text null, "instructions_ar" text null, "instructions_en" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "manual_payment_method_pkey" primary key ("id"));`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_manual_payment_method_code_unique" ON "manual_payment_method" ("code") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_manual_payment_method_deleted_at" ON "manual_payment_method" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "manual_payment_method" cascade;`);
  }

}
