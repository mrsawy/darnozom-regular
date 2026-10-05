import { describe, expect, it } from "vitest";
import { fromZonedInput, toZonedInput } from "./datetime";
import { formatDate } from "./cms-labels";

describe("zoned datetime-local helpers", () => {
  it("shows a UTC instant as wall time in the event's timezone", () => {
    expect(toZonedInput("2026-11-01T08:00:00Z", "Africa/Cairo")).toBe("2026-11-01T10:00");
    expect(toZonedInput("2026-11-01T08:00:00Z", "Asia/Riyadh")).toBe("2026-11-01T11:00");
  });
  it("turns wall time in the event's timezone back into the same instant", () => {
    expect(fromZonedInput("2026-11-01T10:00", "Africa/Cairo")).toBe("2026-11-01T08:00:00.000Z");
    const iso = "2026-07-15T17:30:00.000Z";
    expect(fromZonedInput(toZonedInput(iso, "Africa/Cairo"), "Africa/Cairo")).toBe(iso);
  });
  it("treats empty values as unset", () => {
    expect(toZonedInput(undefined, "Africa/Cairo")).toBe("");
    expect(fromZonedInput("", "Africa/Cairo")).toBeUndefined();
  });
});

describe("formatDate with an explicit timezone", () => {
  it("renders the time in the given zone, not the browser's", () => {
    expect(formatDate("2026-11-01T08:00:00Z", "en", true, "Africa/Cairo")).toMatch(/10:00/);
    expect(formatDate("2026-11-01T08:00:00Z", "en", true, "Asia/Riyadh")).toMatch(/11:00/);
  });
});
