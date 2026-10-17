import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20261015000000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`alter table "book_profile" add column if not exists "is_darnozom" boolean not null default false;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "book_profile" drop column if exists "is_darnozom";`);
  }
}
