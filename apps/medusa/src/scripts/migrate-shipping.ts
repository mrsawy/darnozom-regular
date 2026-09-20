export interface ShippingRateRow {
  id: number;
  city: string;
  price: string;
  currency: string;
  isDefault: boolean;
}

export interface CityRateInput {
  city: string;
  price: number;
  currency: string;
  isDefault: boolean;
}

interface CityShippingServiceLike {
  addCityRates(rows: CityRateInput[]): Promise<unknown>;
}

interface MigrateShippingDeps {
  shippingDb: { select: () => { from: () => Promise<ShippingRateRow[]> } };
  cityShippingService: CityShippingServiceLike;
}

export async function migrateShipping(deps: MigrateShippingDeps): Promise<number> {
  const rows = await deps.shippingDb.select().from();
  const input: CityRateInput[] = rows.map((r) => ({
    city: r.city,
    // Decimal major units (50 means 50.00 EGP) — see city-rate.ts model
    // comment. Source rows are already decimal strings (e.g. "50.00"), same
    // convention as the Express shippingRates table this reads from.
    price: Number(r.price),
    currency: r.currency.toLowerCase(),
    isDefault: r.isDefault,
  }));
  await deps.cityShippingService.addCityRates(input);
  return rows.length;
}
