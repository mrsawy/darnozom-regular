import { afterAll, describe, expect, it } from "vitest";
import { db, events, contentItems } from "@workspace/db";
import { eq } from "drizzle-orm";
import { mapLegacyKind, migrateEventsToContent, parseLegacyEventDate } from "./migrateEventsToContent";

describe("parseLegacyEventDate", () => {
  it("parses English day-month-year", () => {
    expect(parseLegacyEventDate("", "15 March 2026")?.toISOString().slice(0, 10)).toBe("2026-03-15");
  });
  it("parses Arabic month names with Arabic-Indic digits", () => {
    expect(parseLegacyEventDate("١٥ مارس ٢٠٢٦", "")?.toISOString().slice(0, 10)).toBe("2026-03-15");
  });
  it("parses ISO", () => {
    expect(parseLegacyEventDate("", "2026-05-01")?.toISOString().slice(0, 10)).toBe("2026-05-01");
  });
  it("returns null for vague text", () => {
    expect(parseLegacyEventDate("قريبًا", "Coming soon")).toBeNull();
  });
});

describe("mapLegacyKind", () => {
  it("maps known categories and defaults to seminar", () => {
    expect(mapLegacyKind("Workshop", null)).toBe("workshop");
    expect(mapLegacyKind(null, "مؤتمر")).toBe("conference");
    expect(mapLegacyKind("Gathering", "لقاء")).toBe("seminar");
  });
});

describe("migrateEventsToContent", () => {
  const TITLE = "test-cms-legacy-event";
  afterAll(async () => {
    await db.delete(events).where(eq(events.titleAr, TITLE));
    await db.delete(contentItems).where(eq(contentItems.titleAr, TITLE));
  });

  it("copies rows once and flags unparseable dates for review", async () => {
    await db.insert(events).values({ titleAr: TITLE, titleEn: TITLE, dateAr: "قريبًا", dateEn: "Soon", status: "upcoming" });
    await migrateEventsToContent();
    await migrateEventsToContent();
    const rows = await db.select().from(contentItems).where(eq(contentItems.titleAr, TITLE));
    expect(rows).toHaveLength(1);
    expect(rows[0].type).toBe("event");
    expect(rows[0].status).toBe("review");
    expect(rows[0].details.legacyDateText).toBe("قريبًا / Soon");
  });
});
