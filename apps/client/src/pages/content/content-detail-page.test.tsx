import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Router } from "wouter";
import { memoryLocation } from "wouter/memory-location";

vi.mock("@/lib/language-context", () => ({ useLanguage: () => ({ language: "ar", isArabic: true, toggleLanguage: vi.fn() }) }));
vi.mock("@/components/content/page-shell", () => ({ PageShell: ({ children }: any) => <>{children}</> }));
vi.mock("@/components/content/newsletter-block", () => ({ NewsletterBlock: () => null }));
vi.mock("@/pages/not-found", () => ({ default: () => <p>NOT FOUND</p> }));

import ContentDetailPage from "./content-detail-page";

const obs = {
  id: 7, type: "observatory", slug: "o1", status: "published", titleAr: "رصد", titleEn: "", summaryAr: "", summaryEn: "",
  bodyAr: "<p>نص</p>", bodyEn: "", coverImageUrl: "", area: null, authorAr: "", authorEn: "", isExternal: false, externalUrl: "",
  publishedAt: "2026-10-01T00:00:00Z", createdAt: "", updatedAt: "",
  details: { kind: "daily_brief", whatHappenedAr: "<p>حدث</p>", ourReadingAr: "<p>قراءة</p>", researchQuestionsAr: "<p>سؤال</p>", sources: [{ title: "المصدر", url: "https://src.example" }] },
};

function setup(section: any, slug: string, response: { status: number; body?: unknown }) {
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(response.body ?? {}), { status: response.status })));
  const loc = memoryLocation({ path: `/x/${slug}` });
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <Router hook={loc.hook} searchHook={loc.searchHook}>
        <ContentDetailPage section={section} slug={slug} />
      </Router>
    </QueryClientProvider>,
  );
}

afterEach(() => vi.unstubAllGlobals());

describe("ContentDetailPage", () => {
  it("renders observatory sections and sources", async () => {
    setup("observatory", "o1", { status: 200, body: { item: obs, related: [] } });
    expect(await screen.findByRole("heading", { level: 1, name: "رصد" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "ما الذي حدث؟" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "قراءة دار نظم" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "موضوعات تستحق البحث" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "المصدر" }).getAttribute("href")).toBe("https://src.example");
  });

  it("shows NotFound on 404", async () => {
    setup("articles", "missing", { status: 404 });
    expect(await screen.findByText("NOT FOUND")).toBeTruthy();
  });

  it("shows NotFound when the slug belongs to another section", async () => {
    setup("articles", "o1", { status: 200, body: { item: obs, related: [] } });
    expect(await screen.findByText("NOT FOUND")).toBeTruthy();
  });

  it("shows the interest CTA for an event without a date", async () => {
    setup("news-events", "e1", { status: 200, body: { item: { ...obs, type: "event", details: { kind: "seminar", registration: "interest", mode: "in_person" } }, related: [] } });
    expect(await screen.findByRole("link", { name: "سجّل اهتمامك" })).toBeTruthy();
  });
});
