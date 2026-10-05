import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Router } from "wouter";
import { memoryLocation } from "wouter/memory-location";
import AdminContentList from "./content-list";

const item = (id: number) => ({
  id, type: "observatory", slug: `o${id}`, status: "published", titleAr: `رصد ${id}`, titleEn: "", summaryAr: "", summaryEn: "",
  bodyAr: "", bodyEn: "", coverImageUrl: "", area: null, authorAr: "", authorEn: "", isExternal: false, externalUrl: "",
  publishedAt: null, details: { kind: "daily_brief" }, createdAt: "", updatedAt: "",
});

afterEach(() => vi.unstubAllGlobals());

describe("AdminContentList", () => {
  it("pages through more items than fit on one page", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      const page = Number(new URL(url, "http://x").searchParams.get("page") ?? 1);
      return new Response(JSON.stringify({ items: [item(page)], total: 130, page, pageSize: 50 }));
    });
    vi.stubGlobal("fetch", fetchMock);
    const loc = memoryLocation({ path: "/admin/content/observatory" });
    render(<Router hook={loc.hook}><AdminContentList type="observatory" /></Router>);
    await screen.findByText("رصد 1");
    expect(screen.getByText("1 / 3")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "التالي" }));
    await screen.findByText("رصد 2");
    await waitFor(() => expect(String(fetchMock.mock.calls.at(-1)![0])).toContain("page=2"));
  });
});
