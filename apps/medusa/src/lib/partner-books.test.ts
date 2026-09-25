import { describe, it, expect, vi } from "vitest";
import { PartnerError, upsertPartnerBook, type PartnerDeps } from "./partner-books";

const DESCRIPTION = "يتناول هذا الكتاب أصول السياسة الشرعية ومقاصدها، ويعرض أهميتها العلمية في بناء النظم الحديثة، ويخاطب الباحثين وطلاب الدراسات العليا.";
const body = {
  title: "السياسة الشرعية",
  description: DESCRIPTION,
  primary_category_handle: "siyasa-shariyya",
  additional_category_handles: ["governance"],
  print: { price: 150, stock: 10 },
  images: [{ url: "https://cdn.example.com/cover.jpg" }],
  profile: { authors: ["ابن تيمية"], language: "ar", isbn: "978-0-306-40615-7", publisher: "دار نظم" },
};

function deps(over: Partial<PartnerDeps> = {}): PartnerDeps {
  return {
    profileRepo: { listBookProfiles: vi.fn(async () => []), createBookProfiles: vi.fn(), updateBookProfiles: vi.fn() },
    categoryIdsByHandle: vi.fn(async (hs: string[]) => new Map(hs.filter((h) => h !== "nope").map((h) => [h, `pcat_${h}`]))),
    defaultSalesChannelId: vi.fn(async () => "sc_web"),
    productStatus: vi.fn(async () => "draft"),
    importImage: vi.fn(async (url: string) => `https://store/static/${url.split("/").pop()}`),
    createBook: vi.fn(async () => ({ product: { id: "prod_new" } })),
    updateBook: vi.fn(async () => undefined),
    ...over,
  };
}

describe("upsertPartnerBook", () => {
  it("creates a draft with resolved categories and imported images", async () => {
    const d = deps();
    const out = await upsertPartnerBook(d, body);
    expect(out).toEqual({ status: "created", product_id: "prod_new" });
    expect(d.createBook).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "draft",
        sales_channel_id: "sc_web",
        image_urls: ["https://store/static/cover.jpg"],
        additional_category_ids: ["pcat_governance"],
        print: { price: 150, stock: 10 },
        digital: null,
        profile: expect.objectContaining({ isbn: "9780306406157", primary_category_id: "pcat_siyasa-shariyya" }),
      }),
    );
  });

  it("updates the same draft when the ISBN already exists (retry-safe)", async () => {
    const d = deps({
      profileRepo: { listBookProfiles: vi.fn(async () => [{ product_id: "prod_old" } as never]), createBookProfiles: vi.fn(), updateBookProfiles: vi.fn() },
    });
    expect(await upsertPartnerBook(d, body)).toEqual({ status: "updated", product_id: "prod_old" });
    expect(d.createBook).not.toHaveBeenCalled();
    expect(d.updateBook).toHaveBeenCalledWith("prod_old", expect.objectContaining({ title: "السياسة الشرعية" }));
  });

  it("refuses to change a book staff already published", async () => {
    const d = deps({
      profileRepo: { listBookProfiles: vi.fn(async () => [{ product_id: "prod_old" } as never]), createBookProfiles: vi.fn(), updateBookProfiles: vi.fn() },
      productStatus: vi.fn(async () => "published"),
    });
    await expect(upsertPartnerBook(d, body)).rejects.toMatchObject({ status: 409 });
  });

  it("needs an ISBN or external_id so retries can't duplicate", async () => {
    const { isbn, ...profile } = body.profile;
    await expect(upsertPartnerBook(deps(), { ...body, profile })).rejects.toMatchObject({ status: 400 });
  });

  it("lists valid handles when a category handle is unknown", async () => {
    await expect(upsertPartnerBook(deps(), { ...body, primary_category_handle: "nope" })).rejects.toThrow(/Unknown category handle.*nope.*GET \/partner\/categories/);
  });

  it("rejects a too-short description and a digital edition without rights", async () => {
    await expect(upsertPartnerBook(deps(), { ...body, description: "short" })).rejects.toBeInstanceOf(PartnerError);
    await expect(upsertPartnerBook(deps(), { ...body, digital: { price: 50 } })).rejects.toThrow(/digital distribution rights/);
  });

  it("accepts ChatGPT file attachments (openaiFileIdRefs) as images", async () => {
    const d = deps();
    await upsertPartnerBook(d, { ...body, images: [], openaiFileIdRefs: [{ name: "cover.png", download_link: "https://files.oaiusercontent.com/abc" }] });
    expect(d.importImage).toHaveBeenCalledWith("https://files.oaiusercontent.com/abc");
  });

  it("reports an image that can't be imported as 422", async () => {
    const d = deps({ importImage: vi.fn(async () => { throw new Error("https://x: not a public address"); }) });
    await expect(upsertPartnerBook(d, body)).rejects.toMatchObject({ status: 422 });
  });
});
