import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("@/lib/language-context", () => ({ useLanguage: () => ({ language: "ar", isArabic: true, toggleLanguage: vi.fn() }) }));
vi.mock("@/components/site-nav", () => ({ default: () => null }));
vi.mock("@/components/site-footer", () => ({ SiteFooter: ({ tone }: any) => <footer data-tone={tone} /> }));
const booksHook = vi.fn();
vi.mock("@/lib/darnozom-books", async (orig) => ({ ...(await orig<any>()), useDarNozomBooks: () => booksHook(), useStoreBook: () => ({ data: null }) }));

import Home from "./home";

const item = (type: string, slug: string, extra: any = {}) => ({
  id: slug.length, type, slug, status: "published", titleAr: `عنوان ${slug}`, titleEn: "", summaryAr: "", summaryEn: "",
  bodyAr: "", bodyEn: "", coverImageUrl: "", area: null, authorAr: "", authorEn: "", isExternal: false, externalUrl: "",
  publishedAt: "2026-10-01T00:00:00Z", details: {}, createdAt: "", updatedAt: "", ...extra,
});

function renderHome(home: unknown) {
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(home))));
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <Home />
    </QueryClientProvider>,
  );
}

afterEach(() => vi.unstubAllGlobals());

describe("Home", () => {
  it("renders sections in the approved order and hides empty ones", async () => {
    booksHook.mockReturnValue({ data: [], isError: false });
    const { container } = renderHome({
      featured: [],
      observatory: { lead: null, others: [] },
      articles: [item("article", "a1")],
      studies: [],
      publications: [item("publication", "p1", { details: { kind: "report" } })],
      newsEvents: [item("news", "n1")],
    });
    await screen.findByText("عنوان a1");
    const headings = [...container.querySelectorAll("h2")].map((h) => h.textContent);
    expect(headings).toEqual(["عن دار نظم", "المقالات", "الإصدارات", "الأخبار والفعاليات", "كل جديد من دار نظم يصلك على بريدك"]);
    expect(container.querySelector("footer")!.getAttribute("data-tone")).toBe("light");
  });

  it("still renders admin publications when the book store is unavailable", async () => {
    booksHook.mockReturnValue({ data: undefined, isError: true });
    renderHome({
      featured: [], observatory: { lead: null, others: [] }, articles: [], studies: [], newsEvents: [],
      publications: [item("publication", "p2", { details: { kind: "periodical" } })],
    });
    expect(await screen.findByText("عنوان p2")).toBeTruthy();
    expect(screen.getByText("دورية")).toBeTruthy();
  });
});
