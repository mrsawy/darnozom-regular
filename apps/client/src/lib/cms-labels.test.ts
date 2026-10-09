import { describe, expect, it } from "vitest";
import { contentPath, ctaLabel, eventCta, pickLang, typeBadge } from "./cms-labels";

describe("cms labels", () => {
  it("falls back to Arabic when English is empty", () => {
    const item = { titleAr: "عنوان", titleEn: "" } as any;
    expect(pickLang(item, "title", "en")).toBe("عنوان");
    expect(pickLang({ titleAr: "ع", titleEn: "Title" } as any, "title", "en")).toBe("Title");
  });
  it("badges publications and events by kind", () => {
    expect(typeBadge("publication", { kind: "periodical" }, "ar")).toBe("دورية");
    expect(typeBadge("event", { kind: "workshop" }, "ar")).toBe("ورش");
    expect(typeBadge("news", {}, "en")).toBe("News");
  });
  it("uses the brief's CTA verbs", () => {
    expect(ctaLabel("article", {}, "ar")).toBe("اقرأ المقال");
    expect(ctaLabel("publication", { kind: "report" }, "ar")).toBe("اطّلع على التقرير");
    expect(ctaLabel("publication", { kind: "periodical" }, "ar")).toBe("تصفح الدورية");
    expect(ctaLabel("observatory", {}, "ar")).toBe("اقرأ الموجز");
  });
  it("routes news and events to /news-events", () => {
    expect(contentPath("event", "x")).toBe("/news-events/x");
    expect(contentPath("study", "y")).toBe("/studies/y");
  });
  it("picks the event CTA from registration and date", () => {
    expect(eventCta({ registration: "interest" }, "ar").label).toBe("سجّل اهتمامك");
    expect(eventCta({ registration: "open", registrationUrl: "https://r.x", startsAt: "2099-01-01T00:00:00Z" }, "ar")).toEqual({ label: "سجّل للمشاركة", href: "https://r.x" });
    expect(eventCta({ registration: "open", startsAt: "2001-01-01T00:00:00Z" }, "ar").label).toBe("اطّلع على ملخص الفعالية");
  });
});
