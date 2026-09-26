const str = (description: string, extra: Record<string, unknown> = {}) => ({ type: "string", description, ...extra });
const int = (description: string) => ({ type: "integer", description });
const list = (description: string) => ({ type: "array", items: { type: "string" }, description });

function jsonResponse(description: string, schema: Record<string, unknown>) {
  return {
    description,
    content: { "application/json": { schema } },
  };
}

export function buildPartnerOpenApi(serverUrl: string): Record<string, unknown> {
  const url = serverUrl.replace(/\/+$/, "");
  const json = (ref: string) => ({ "application/json": { schema: { $ref: `#/components/schemas/${ref}` } } });
  // ChatGPT Custom GPT Actions currently accept OpenAPI 3.1.0 / 3.1.1.
  return {
    openapi: "3.1.0",
    info: {
      title: "Dar Nozom Books API",
      version: "1.0.0",
      description:
        "Create and update DRAFT books in the Dar Nozom store. Staff review and publish them. Digital book files are uploaded by staff, never through this API.",
    },
    servers: [{ url }],
    security: [{ apiKey: [] }],
    paths: {
      "/partner/categories": {
        get: {
          operationId: "listCategories",
          summary: "List sections and subcategories (use their handles)",
          responses: {
            "200": jsonResponse("Classification", {
              type: "object",
              properties: {
                sections: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      handle: { type: "string" },
                      name: { type: "string" },
                      name_ar: { type: "string", nullable: true },
                      subcategories: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            handle: { type: "string" },
                            name: { type: "string" },
                            name_ar: { type: "string", nullable: true },
                          },
                        },
                      },
                    },
                  },
                },
              },
            }),
          },
        },
      },
      "/partner/books": {
        get: {
          operationId: "findBook",
          summary: "Check whether a book already exists",
          parameters: [
            { name: "isbn", in: "query", schema: { type: "string" }, required: false },
            { name: "external_id", in: "query", schema: { type: "string" }, required: false },
          ],
          responses: {
            "200": jsonResponse("Lookup result", {
              type: "object",
              properties: {
                book: {
                  type: "object",
                  nullable: true,
                  properties: {
                    product_id: { type: "string" },
                    status: { type: "string" },
                  },
                },
              },
            }),
          },
        },
        post: {
          operationId: "upsertBook",
          summary: "Create a draft book, or update it while it is still a draft (matched by ISBN or external_id)",
          requestBody: { required: true, content: json("Book") },
          responses: {
            "201": jsonResponse("Created", { $ref: "#/components/schemas/UpsertResult" }),
            "200": jsonResponse("Updated", { $ref: "#/components/schemas/UpsertResult" }),
            "400": jsonResponse("Invalid input", { $ref: "#/components/schemas/Error" }),
            "409": jsonResponse("Already published", { $ref: "#/components/schemas/Error" }),
            "422": jsonResponse("Image could not be imported", { $ref: "#/components/schemas/Error" }),
          },
        },
      },
      "/partner/books/bulk": {
        post: {
          operationId: "upsertBooksBulk",
          summary: "Create/update up to 20 draft books; each result is reported separately",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["books"],
                  properties: {
                    books: { type: "array", maxItems: 20, items: { $ref: "#/components/schemas/Book" } },
                  },
                },
              },
            },
          },
          responses: {
            "200": jsonResponse("Bulk results", {
              type: "object",
              properties: {
                results: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      index: { type: "integer" },
                      ok: { type: "boolean" },
                      status: { type: "string" },
                      product_id: { type: "string" },
                      message: { type: "string" },
                    },
                  },
                },
              },
            }),
          },
        },
      },
    },
    components: {
      securitySchemes: { apiKey: { type: "apiKey", in: "header", name: "x-api-key" } },
      schemas: {
        UpsertResult: {
          type: "object",
          properties: {
            status: { type: "string", enum: ["created", "updated"] },
            product_id: { type: "string" },
          },
        },
        Error: {
          type: "object",
          properties: {
            message: { type: "string" },
            errors: { type: "array", items: { type: "string" } },
          },
        },
        Book: {
          type: "object",
          required: ["title", "description", "primary_category_handle", "profile"],
          properties: {
            title: str("Book title as printed"),
            subtitle: str("Subtitle, if any"),
            description: str(
              "Professional description (80+ characters): subject, main themes, scholarly significance, target audience.",
            ),
            primary_category_handle: str("Subcategory (or section) handle from listCategories"),
            additional_category_handles: list("Extra subject category handles"),
            print: {
              type: "object",
              properties: { price: { type: "number", description: "EGP" }, stock: int("Copies in stock") },
              required: ["price"],
            },
            digital: {
              type: "object",
              properties: { price: { type: "number", description: "EGP; requires profile.digital_rights true" } },
              required: ["price"],
            },
            images: {
              type: "array",
              maxItems: 10,
              items: {
                type: "object",
                required: ["url"],
                properties: { url: str("Public https image URL; the first image is the cover") },
              },
            },
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
            digital_rights: {
              type: "boolean",
              description: "True only if the publisher granted digital distribution rights",
            },
          },
        },
      },
    },
  };
}
