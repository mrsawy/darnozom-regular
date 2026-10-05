import { describe, expect, it } from "vitest";
import { isPublicObjectKey } from "@workspace/object-store";

// CMS uploads (covers, inline images, slide images, study/publication PDFs) are
// shown on public pages, so anonymous visitors must be able to fetch them.
describe("CMS upload folders are publicly readable", () => {
  it("serves cms/ and featured/ objects without a session", () => {
    expect(isPublicObjectKey("cms/0b5d2c1e-0000-4000-8000-000000000000")).toBe(true);
    expect(isPublicObjectKey("featured/0b5d2c1e-0000-4000-8000-000000000000")).toBe(true);
  });
  it("keeps other folders private", () => {
    expect(isPublicObjectKey("digital-files/x.pdf")).toBe(false);
  });
});
