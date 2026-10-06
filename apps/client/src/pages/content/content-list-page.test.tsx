import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Router } from "wouter";
import { memoryLocation } from "wouter/memory-location";

vi.mock("@/lib/language-context", () => ({ useLanguage: () => ({ language: "ar", isArabic: true, toggleLanguage: vi.fn() }) }));
vi.mock("@/components/content/page-shell", () => ({ PageShell: ({ children }: any) => <>{children}</> }));
vi.mock("@/lib/darnozom-books", () => ({ useDarNozomBooks: () => ({ data: [], isLoading: false }) }));

import ContentListPage from "./content-list-page";

const item = (slug: string) => ({
  id: 1, type: "event", slug, status: "published", titleAr: `فعالية ${slug}`, titleEn: "", summaryAr: "", summaryEn: "",
  bodyAr: "", bodyEn: "", coverImageUrl: "", area: null, authorAr: "", authorEn: "", isExternal: false, externalUrl: "",
  publishedAt: "2026-10-01T00:00:00Z", details: { kind: "seminar" }, createdAt: "", updatedAt: "",
});

function setup(path: string, items = [item("e1")]) {
  const fetchMock = vi.fn(async (_url: RequestInfo | URL) => new Response(JSON.stringify({ items, total: items.length, page: 1, pageSize: 12 })));
  vi.stubGlobal("fetch", fetchMock);
  const loc = memoryLocation({ path, record: true });
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <Router hook={loc.hook} searchHook={loc.searchHook}>
        <ContentListPage section="news-events" />
      </Router>
    </QueryClientProvider>,
  );
  return { fetchMock, loc };
}

afterEach(() => vi.unstubAllGlobals());

describe("ContentListPage", () => {
  it("reads tab and filters from the URL into the API call", async () => {
    const { fetchMock } = setup("/news-events?tab=events&kind=seminar");
    await screen.findByText("فعالية e1");
    const url = String(fetchMock.mock.calls.map((c) => c[0]).find((u) => String(u).includes("/api/cms/items")));
    expect(url).toContain("type=event");
    expect(url).toContain("kind=seminar");
    expect(url).toContain("when=upcoming");
  });

  it("writes tab changes back to the URL", async () => {
    const { loc } = setup("/news-events?tab=events");
    await screen.findByText("فعالية e1");
    fireEvent.click(screen.getByRole("tab", { name: "الأخبار" }));
    await waitFor(() => expect(loc.history!.at(-1)).toBe("/news-events?tab=news"));
  });

  it("shows an empty state", async () => {
    setup("/news-events?tab=news", []);
    expect(await screen.findByText("لا توجد مواد منشورة بعد في هذا القسم.")).toBeTruthy();
  });
});
