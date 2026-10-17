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
  it("renders the reading list for a signed-in user", () => {
    render(<AccountLibraryPage />);
    expect(screen.getByRole("heading", { name: "Reading list" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Saved items" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Reading list is empty" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Browse publications →" })).toBeTruthy();
  });
});
