import { describe, it, expect } from "vitest";
import { buildPartnerOpenApi } from "./partner-openapi";

describe("buildPartnerOpenApi", () => {
  const doc = buildPartnerOpenApi("https://ecommerce.darnozom.com/") as any;

  it("describes every partner operation for a Custom GPT Action", () => {
    expect(doc.openapi).toBe("3.1.0");
    expect(doc.servers).toEqual([{ url: "https://ecommerce.darnozom.com" }]);
    const ops = Object.values(doc.paths).flatMap((p: any) => Object.values(p).map((o: any) => o.operationId));
    expect(ops.sort()).toEqual(["findBook", "listCategories", "upsertBook", "upsertBooksBulk"]);
    expect(doc.components.securitySchemes.apiKey).toEqual({ type: "apiKey", in: "header", name: "x-api-key" });
  });

  it("requires the fields the server requires", () => {
    const book = doc.components.schemas.Book;
    expect(book.required).toEqual(["title", "description", "primary_category_handle", "profile"]);
    expect(doc.components.schemas.Profile.required).toEqual(["authors", "language"]);
  });

  it("describes openaiFileIdRefs as objects with download_link (matching partnerBookSchema)", () => {
    const refs = doc.components.schemas.Book.properties.openaiFileIdRefs;
    expect(refs.items).toMatchObject({
      type: "object",
      required: ["download_link"],
      properties: { download_link: expect.objectContaining({ type: "string" }) },
    });
  });
});
