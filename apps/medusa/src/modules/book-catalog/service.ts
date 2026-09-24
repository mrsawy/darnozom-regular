import { MedusaService } from "@medusajs/framework/utils";
import { BookProfile } from "./models/book-profile";

// Generated CRUD: listBookProfiles / createBookProfiles / updateBookProfiles /
// deleteBookProfiles. Upsert rules live in profile-store.ts (unit-tested).
class BookCatalogModuleService extends MedusaService({ BookProfile }) {}

export default BookCatalogModuleService;
