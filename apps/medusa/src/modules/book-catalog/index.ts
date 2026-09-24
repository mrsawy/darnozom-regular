import { Module } from "@medusajs/framework/utils";
import BookCatalogModuleService from "./service";

export const BOOK_CATALOG_MODULE = "bookCatalog";

export default Module(BOOK_CATALOG_MODULE, {
  service: BookCatalogModuleService,
});

export * from "./profile-store";
