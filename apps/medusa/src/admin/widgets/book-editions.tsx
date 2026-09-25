import { defineWidgetConfig } from "@medusajs/admin-sdk";
import type { AdminProduct, DetailWidgetProps } from "@medusajs/framework/types";
import { Badge, Button, Container, Heading, Input, Label, Switch, Text, toast } from "@medusajs/ui";
import { useCallback, useEffect, useState } from "react";
import { isBookProduct } from "./book-profile";

type Edition = { variant_id: string; kind: "paper" | "digital"; title: string; price: number | null; sale_enabled: boolean };

const BookEditionsWidget = ({ data: product }: DetailWidgetProps<AdminProduct>) => {
  const [editions, setEditions] = useState<Edition[] | null>(null);
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("0");

  const load = useCallback(async () => {
    const r = await fetch(`/admin/books/${product.id}/editions`, { credentials: "include" });
    const b = await r.json();
    setEditions(b.editions ?? []);
  }, [product.id]);
  useEffect(() => { void load(); }, [load]);

  const call = async (url: string, body: unknown) => {
    const r = await fetch(url, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const b = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(b.message || `Failed (${r.status})`);
  };

  const add = async (kind: "paper" | "digital") => {
    try {
      await call(`/admin/books/${product.id}/editions`, { kind, price: Number(price), ...(kind === "paper" ? { stock: Number(stock) } : {}) });
      toast.success(`${kind === "paper" ? "Print" : "Digital"} edition added`);
      setPrice("");
      await load();
    } catch (e) {
      toast.error("Could not add edition", { description: (e as Error).message });
    }
  };

  const toggle = async (e: Edition, on: boolean) => {
    try {
      await call(`/admin/books/${product.id}/editions/${e.variant_id}`, { sale_enabled: on });
      await load();
    } catch (err) {
      toast.error("Could not update", { description: (err as Error).message });
    }
  };

  if (!editions || !isBookProduct(product)) return null;
  const has = (k: Edition["kind"]) => editions.some((e) => e.kind === k);

  return (
    <Container className="divide-y p-0">
      <div className="px-6 py-4">
        <Heading level="h2">Editions</Heading>
        <Text size="small" className="text-ui-fg-subtle">Print and digital are sold separately. Edit prices and stock on each variant.</Text>
      </div>
      {editions.map((e) => (
        <div key={e.variant_id} className="flex items-center justify-between gap-2 px-6 py-3">
          <div className="flex items-center gap-2">
            <Badge size="2xsmall" color={e.kind === "digital" ? "purple" : "blue"}>{e.kind === "digital" ? "Digital" : "Print"}</Badge>
            <Text size="small">{e.price != null ? `${e.price.toFixed(2)} EGP` : "No EGP price"}</Text>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={e.sale_enabled} onCheckedChange={(on) => toggle(e, on)} />
            {e.sale_enabled ? "On sale" : "Off sale"}
          </label>
        </div>
      ))}
      {(!has("paper") || !has("digital")) && (
        <div className="flex flex-col gap-2 px-6 py-4">
          <Label>Add an edition</Label>
          <div className="flex gap-2">
            <Input type="number" min="0.01" step="0.01" placeholder="Price (EGP)" value={price} onChange={(ev) => setPrice(ev.target.value)} />
            {!has("paper") && <Input type="number" min="0" step="1" placeholder="Stock" value={stock} onChange={(ev) => setStock(ev.target.value)} />}
          </div>
          <div className="flex gap-2">
            {!has("paper") && <Button size="small" variant="secondary" onClick={() => add("paper")}>Add print edition</Button>}
            {!has("digital") && <Button size="small" variant="secondary" onClick={() => add("digital")}>Add digital edition</Button>}
          </div>
        </div>
      )}
    </Container>
  );
};

export const config = defineWidgetConfig({ zone: "product.details.side.after" });
export default BookEditionsWidget;
