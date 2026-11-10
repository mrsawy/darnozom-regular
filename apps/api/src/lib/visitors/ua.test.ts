import { describe, expect, it } from "vitest";
import { parseUserAgent } from "./ua";

describe("parseUserAgent", () => {
  it("flags bots and empty agents", () => {
    expect(parseUserAgent("Googlebot/2.1").isBot).toBe(true);
    expect(parseUserAgent(undefined).isBot).toBe(true);
  });
  it("detects iPhone Safari as mobile", () => {
    const r = parseUserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1");
    expect(r).toMatchObject({ device: "mobile", browser: "Safari", os: "iOS", isBot: false });
  });
  it("detects desktop Chrome on Windows", () => {
    const r = parseUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0 Safari/537.36");
    expect(r).toMatchObject({ device: "desktop", browser: "Chrome", os: "Windows", isBot: false });
  });
});
