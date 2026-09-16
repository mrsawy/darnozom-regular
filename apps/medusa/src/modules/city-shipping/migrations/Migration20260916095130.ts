import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260916095130 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "city_rate" drop constraint if exists "city_rate_city_unique";`);
    this.addSql(`create table if not exists "city_rate" ("id" text not null, "city" text not null, "price" integer not null, "currency" text not null, "is_default" boolean not null default false, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "city_rate_pkey" primary key ("id"));`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_city_rate_city_unique" ON "city_rate" ("city") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_city_rate_deleted_at" ON "city_rate" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "city_rate" cascade;`);
  }

}
