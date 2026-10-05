import { describe, expect, it } from "vitest";
import { slugify, withSuffix } from "./slug";

describe("slugify", () => {
  it("lowercases and dashes English titles", () => {
    expect(slugify("Public Value & Decision Quality")).toBe("public-value-decision-quality");
  });
  it("strips accents", () => {
    expect(slugify("Café Réunion")).toBe("cafe-reunion");
  });
  it("returns empty string for Arabic-only input", () => {
    expect(slugify("القيمة العامة")).toBe("");
  });
  it("caps length at 80 without a trailing dash", () => {
    const s = slugify("a ".repeat(100));
    expect(s.length).toBeLessThanOrEqual(80);
    expect(s.endsWith("-")).toBe(false);
  });
});

describe("withSuffix", () => {
  it("leaves the first slug unchanged and numbers the rest", () => {
    expect(withSuffix("x", 1)).toBe("x");
    expect(withSuffix("x", 3)).toBe("x-3");
  });
});
