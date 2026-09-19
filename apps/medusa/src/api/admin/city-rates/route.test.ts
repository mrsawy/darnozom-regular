import { describe, it, expect, vi } from "vitest";
import { GET, POST } from "./route";

function fakeReq(overrides: { listCityRates?: any; addCityRates?: any; body?: any } = {}) {
  return {
    body: overrides.body,
    scope: {
      resolve: () => ({
        listCityRates: overrides.listCityRates ?? vi.fn(),
        addCityRates: overrides.addCityRates ?? vi.fn(),
      }),
    },
  } as any;
}

function fakeRes() {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

describe("GET /admin/city-rates", () => {
  it("lists all city rates via listCityRates({})", async () => {
    const listCityRates = vi.fn().mockResolvedValue([
      { id: "cr_1", city: "Cairo", price: 5000, currency: "egp", is_default: false },
    ]);
    const res = fakeRes();
    await GET(fakeReq({ listCityRates }), res);

    expect(listCityRates).toHaveBeenCalledWith({});
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      cityRates: [{ id: "cr_1", city: "Cairo", price: 5000, currency: "egp", is_default: false }],
    });
  });
});

describe("POST /admin/city-rates", () => {
  it("creates a city rate via addCityRates([body]) and returns the first created entity", async () => {
    const body = { city: "Giza", price: 4000, currency: "egp", isDefault: false };
    const addCityRates = vi.fn().mockResolvedValue([
      { id: "cr_2", city: "Giza", price: 4000, currency: "egp", is_default: false },
    ]);
    const res = fakeRes();
    await POST(fakeReq({ addCityRates, body }), res);

    expect(addCityRates).toHaveBeenCalledWith([body]);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      cityRate: { id: "cr_2", city: "Giza", price: 4000, currency: "egp", is_default: false },
    });
  });
});
