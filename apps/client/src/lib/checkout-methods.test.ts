import { describe, it, expect } from "vitest";
import { codAvailability } from "./checkout-methods";

describe("codAvailability", () => {
  it("is available for a paper-only cart when the region offers COD", () => {
    expect(codAvailability(["cash_on_delivery", "instapay"], false)).toBe("available");
  });

  it("is blocked (shown disabled with the reason) when the cart has a digital book", () => {
    expect(codAvailability(["cash_on_delivery", "instapay"], true)).toBe("blocked_digital");
  });

  it("is not shown when the region doesn't offer COD", () => {
    expect(codAvailability(["instapay"], true)).toBe("not_offered");
    expect(codAvailability(["instapay"], false)).toBe("not_offered");
  });
});
