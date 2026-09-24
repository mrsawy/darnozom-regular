export type CodAvailability = "available" | "blocked_digital" | "not_offered";

/**
 * Cash on delivery only works for paper books (cash is collected when the
 * parcel arrives). If the region offers COD but the cart has a digital book,
 * checkout still shows COD — disabled, with the reason — instead of hiding it.
 */
export function codAvailability(regionMethods: string[], hasDigitalItems: boolean): CodAvailability {
  if (!regionMethods.includes("cash_on_delivery")) return "not_offered";
  return hasDigitalItems ? "blocked_digital" : "available";
}
