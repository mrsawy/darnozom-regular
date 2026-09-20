import { defineRouteConfig } from "@medusajs/admin-sdk";
import { Container, Heading, Table, Input, Button } from "@medusajs/ui";
import { useEffect, useState } from "react";

interface CityRate {
  id: string;
  city: string;
  price: number;
  currency: string;
  is_default: boolean;
}

const CityRatesPage = () => {
  const [rates, setRates] = useState<CityRate[]>([]);
  const [newCity, setNewCity] = useState("");
  const [newPrice, setNewPrice] = useState("");

  const load = async () => {
    const res = await fetch("/admin/city-rates", { credentials: "include" });
    const body = await res.json();
    setRates(body.cityRates);
  };

  useEffect(() => {
    load();
  }, []);

  const addRate = async () => {
    await fetch("/admin/city-rates", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        city: newCity,
        // Decimal major units (50 means 50.00 EGP) — see city-rate.ts model
        // comment. Round to cents so float input doesn't drift.
        price: Math.round(Number(newPrice) * 100) / 100,
        currency: "egp",
        isDefault: false,
      }),
    });
    setNewCity("");
    setNewPrice("");
    await load();
  };

  return (
    <Container>
      <Heading level="h1">City Shipping Rates</Heading>
      <Table>
        <Table.Header>
          <Table.Row>
            <Table.HeaderCell>City</Table.HeaderCell>
            <Table.HeaderCell>Price (EGP)</Table.HeaderCell>
            <Table.HeaderCell>Default</Table.HeaderCell>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {rates.map((r) => (
            <Table.Row key={r.id}>
              <Table.Cell>{r.city}</Table.Cell>
              <Table.Cell>{r.price.toFixed(2)}</Table.Cell>
              <Table.Cell>{r.is_default ? "Yes" : ""}</Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table>
      <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
        <Input placeholder="City" value={newCity} onChange={(e) => setNewCity(e.target.value)} />
        <Input placeholder="Price (EGP)" value={newPrice} onChange={(e) => setNewPrice(e.target.value)} />
        <Button onClick={addRate}>Add</Button>
      </div>
    </Container>
  );
};

export const config = defineRouteConfig({ label: "City Rates" });
export default CityRatesPage;
