import { describe, expect, it } from "vitest";
import { MAIN_NAV, activeNavKey } from "./nav-config";

describe("nav config", () => {
  it("has the seven approved entries in order", () => {
    expect(MAIN_NAV.map((e) => e.labelAr)).toEqual([
      "عن دار نظم", "خدماتنا", "المعرفة والبحوث", "الأكاديمية", "المكتبة والإصدارات", "الأخبار والفعاليات", "تواصل معنا",
    ]);
    expect(MAIN_NAV.map((e) => e.labelEn)).toEqual([
      "About DarNozom", "Services", "Knowledge and Research", "Academy", "Library and Publications", "News and Events", "Contact Us",
    ]);
  });
  it("uses only site-relative links", () => {
    for (const e of MAIN_NAV) {
      expect(e.href.startsWith("/")).toBe(true);
      for (const c of e.columns) for (const l of c.links) expect(l.href.startsWith("/")).toBe(true);
    }
  });
  it("marks the right entry active", () => {
    expect(activeNavKey("/observatory/x")).toBe("knowledge");
    expect(activeNavKey("/center/x")).toBe("knowledge");
    expect(activeNavKey("/services/research")).toBe("services");
    expect(activeNavKey("/services/store/books/1")).toBe("library");
    expect(activeNavKey("/services/consulting")).toBe("services");
    expect(activeNavKey("/academy/courses")).toBe("academy");
    expect(activeNavKey("/news-events")).toBe("news");
    expect(activeNavKey("/")).toBeNull();
  });
});
