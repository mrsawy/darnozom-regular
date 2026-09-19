import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260915142514 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "digital_product_file" ("id" text not null, "relative_key" text not null, "checksum" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "digital_product_file_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_digital_product_file_deleted_at" ON "digital_product_file" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "entitlement" ("id" text not null, "customer_id" text not null, "variant_id" text not null, "order_id" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "entitlement_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_entitlement_deleted_at" ON "entitlement" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "digital_product_file" cascade;`);

    this.addSql(`drop table if exists "entitlement" cascade;`);
  }

}
