import { describe, it, expect, vi } from "vitest";
import { PUT, DELETE } from "./route";

function fakeReq(overrides: { updateCityRates?: any; deleteCityRates?: any; body?: any; id?: string } = {}) {
  return {
    params: { id: overrides.id ?? "cr_1" },
    body: overrides.body,
    scope: {
      resolve: () => ({
        updateCityRates: overrides.updateCityRates ?? vi.fn(),
        deleteCityRates: overrides.deleteCityRates ?? vi.fn(),
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

describe("PUT /admin/city-rates/[id]", () => {
  it("updates a city rate via updateCityRates({ id, ...body }) and returns the updated entity", async () => {
    const body = { price: 6000 };
    const updateCityRates = vi.fn().mockResolvedValue({
      id: "cr_1",
      city: "Cairo",
      price: 6000,
      currency: "egp",
      is_default: false,
    });
    const res = fakeRes();
    await PUT(fakeReq({ updateCityRates, body, id: "cr_1" }), res);

    expect(updateCityRates).toHaveBeenCalledWith({ id: "cr_1", price: 6000 });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      cityRate: { id: "cr_1", city: "Cairo", price: 6000, currency: "egp", is_default: false },
    });
  });
});

describe("DELETE /admin/city-rates/[id]", () => {
  it("deletes a city rate via deleteCityRates(id) and reports the deleted id", async () => {
    const deleteCityRates = vi.fn().mockResolvedValue(undefined);
    const res = fakeRes();
    await DELETE(fakeReq({ deleteCityRates, id: "cr_1" }), res);

    expect(deleteCityRates).toHaveBeenCalledWith("cr_1");
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ id: "cr_1", deleted: true });
  });
});
