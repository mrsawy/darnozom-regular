import { describe, expect, it } from "vitest";
import { buildListUrl } from "./cms-api";

describe("buildListUrl", () => {
  it("joins types and drops empty params", () => {
    expect(buildListUrl({ types: ["news", "event"], area: "", q: "", page: 1, pageSize: 12 })).toBe(
      "/api/cms/items?type=news%2Cevent&page=1&pageSize=12",
    );
  });
  it("encodes search text", () => {
    expect(buildListUrl({ types: ["article"], q: "الحوكمة" })).toContain("q=%D8%A7");
  });
});
