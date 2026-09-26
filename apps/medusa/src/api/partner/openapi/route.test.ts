import { describe, it, expect } from "vitest";
import { partnerOpenApiServerUrl } from "./route";

describe("partnerOpenApiServerUrl", () => {
  it("uses the public ngrok / forwarded host so ChatGPT Actions can call it", () => {
    const url = partnerOpenApiServerUrl({
      headers: {
        host: "localhost:9010",
        "x-forwarded-host": "24f4-196-135-79-11.ngrok-free.app",
        "x-forwarded-proto": "https",
      },
    } as any);
    expect(url).toBe("https://24f4-196-135-79-11.ngrok-free.app");
  });

  it("falls back to MEDUSA_BACKEND_URL for plain localhost", () => {
    const prev = process.env.MEDUSA_BACKEND_URL;
    process.env.MEDUSA_BACKEND_URL = "http://localhost:9010";
    try {
      expect(partnerOpenApiServerUrl({ headers: { host: "localhost:9010" } } as any)).toBe("http://localhost:9010");
    } finally {
      process.env.MEDUSA_BACKEND_URL = prev;
    }
  });
});
