import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@/lib/auth-client", () => ({
  useSession: () => ({ data: { user: { id: "u1" } }, isPending: false }),
}));
vi.mock("@/lib/language-context", () => ({
  useLanguage: () => ({ language: "en" }),
}));
vi.mock("@/components/site-nav", () => ({ default: () => null }));
vi.mock("@/components/site-footer", () => ({ SiteFooter: () => null }));

import AccountLibraryPage from "./account-library";

afterEach(() => vi.unstubAllGlobals());

describe("AccountLibraryPage", () => {
  it("shows the signed-in customer's digital books with their files", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            books: [
              {
                key: "v1",
                title: "My Book",
                imageUrl: null,
                orderId: 1,
                status: "available",
                files: [{ id: "f1", title: "Full book", fileName: "b.pdf", kind: "pdf", size: 10, url: "/api/account/me/library/files/f1" }],
              },
            ],
          }),
        ),
      ),
    );
    render(<AccountLibraryPage />);
    expect(screen.getByRole("heading", { name: "My Library" })).toBeTruthy();
    expect(await screen.findByText("Full book")).toBeTruthy();
    expect(screen.getByTestId("library-download-f1").getAttribute("href")).toBe(
      "/api/account/me/library/files/f1?download=1",
    );
  });
});
