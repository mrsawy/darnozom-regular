const str = (description: string, extra: Record<string, unknown> = {}) => ({ type: "string", description, ...extra });
const int = (description: string) => ({ type: "integer", description });
const list = (description: string) => ({ type: "array", items: { type: "string" }, description });

export function buildPartnerOpenApi(serverUrl: string): Record<string, unknown> {
  const url = serverUrl.replace(/\/+$/, "");
  const json = (ref: string) => ({ "application/json": { schema: { $ref: `#/components/schemas/${ref}` } } });
  return {
    openapi: "3.1.0",
    info: {
      title: "Dar Nozom Books API",
      version: "1.0.0",
      description: "Create and update DRAFT books in the Dar Nozom store. Staff review and publish them. Digital book files are uploaded by staff, never through this API.",
    },
    servers: [{ url }],
    security: [{ apiKey: [] }],
    paths: {
      "/partner/categories": {
        get: { operationId: "listCategories", summary: "List sections and subcategories (use their handles)", responses: { "200": { description: "Classification" } } },
      },
      "/partner/books": {
        get: {
          operationId: "findBook",
          summary: "Check whether a book already exists",
          parameters: [
            { name: "isbn", in: "query", schema: { type: "string" } },
            { name: "external_id", in: "query", schema: { type: "string" } },
          ],
          responses: { "200": { description: "{ book: { product_id, status } | null }" } },
        },
        post: {
          operationId: "upsertBook",
          summary: "Create a draft book, or update it while it is still a draft (matched by ISBN or external_id)",
          requestBody: { required: true, content: json("Book") },
          responses: { "201": { description: "Created" }, "200": { description: "Updated" }, "400": { description: "Invalid input — read message" }, "409": { description: "Already published — staff edit it" }, "422": { description: "Image could not be imported" } },
        },
      },
      "/partner/books/bulk": {
        post: {
          operationId: "upsertBooksBulk",
          summary: "Create/update up to 20 draft books; each result is reported separately",
          requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["books"], properties: { books: { type: "array", maxItems: 20, items: { $ref: "#/components/schemas/Book" } } } } } } },
          responses: { "200": { description: "{ results: [{ index, ok, status?, product_id?, message? }] }" } },
        },
      },
    },
    components: {
      securitySchemes: { apiKey: { type: "apiKey", in: "header", name: "x-api-key" } },
      schemas: {
        Book: {
          type: "object",
          required: ["title", "description", "primary_category_handle", "profile"],
          properties: {
            title: str("Book title as printed"),
            subtitle: str("Subtitle, if any"),
            description: str("Professional description (80+ characters): subject, main themes, scholarly significance, target audience."),
            primary_category_handle: str("Subcategory (or section) handle from listCategories"),
            additional_category_handles: list("Extra subject category handles"),
            print: { type: "object", properties: { price: { type: "number", description: "EGP" }, stock: int("Copies in stock") }, required: ["price"] },
            digital: { type: "object", properties: { price: { type: "number", description: "EGP; requires profile.digital_rights true" } }, required: ["price"] },
            images: { type: "array", maxItems: 10, items: { type: "object", required: ["url"], properties: { url: str("Public https image URL; the first image is the cover") } } },
            openaiFileIdRefs: {
              type: "array",
              maxItems: 10,
              description: "Images attached in the chat (cover first)",
              items: {
                type: "object",
                required: ["download_link"],
                properties: {
                  name: str("Original filename, if known"),
                  mime_type: str("MIME type, if known"),
                  download_link: str("HTTPS URL ChatGPT provides for the attached file"),
                },
              },
            },
            profile: { $ref: "#/components/schemas/Profile" },
          },
        },
        Profile: {
          type: "object",
          required: ["authors", "language"],
          properties: {
            authors: list("Author names"),
            editors: list("Editor names, if any"),
            translators: list("Translator names, if any"),
            publisher: str("Publisher"),
            isbn: str("ISBN-10 or ISBN-13; hyphens allowed. Send isbn OR external_id."),
            external_id: str("Your stable id for a book without ISBN"),
            publication_year: int("Year of publication"),
            edition_number: int("Edition number"),
            pages: int("Number of pages"),
            volumes: int("Number of volumes (default 1)"),
            language: str("Book language", { enum: ["ar", "en", "both"] }),
            keywords: list("Search keywords"),
            target_audience: str("Who the book is for"),
            table_of_contents: str("One chapter per line"),
            digital_rights: { type: "boolean", description: "True only if the publisher granted digital distribution rights" },
          },
        },
      },
    },
  };
}
