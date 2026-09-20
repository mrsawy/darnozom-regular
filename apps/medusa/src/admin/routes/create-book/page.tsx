import { defineRouteConfig } from "@medusajs/admin-sdk";
import {
  Button,
  Container,
  Heading,
  Input,
  Label,
  Select,
  Text,
  Textarea,
  toast,
} from "@medusajs/ui";
import { FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

type SalesChannel = { id: string; name: string };

const CreateBookPage = () => {
  const navigate = useNavigate();
  const [channels, setChannels] = useState<SalesChannel[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<"draft" | "published">("draft");
  const [salesChannelId, setSalesChannelId] = useState("");
  const [paperPrice, setPaperPrice] = useState("");
  const [digitalPrice, setDigitalPrice] = useState("");
  const [paperInventoryQty, setPaperInventoryQty] = useState("20");
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const res = await fetch("/admin/sales-channels?limit=50", {
        credentials: "include",
      });
      if (!res.ok) return;
      const body = await res.json();
      const list: SalesChannel[] = body.sales_channels ?? [];
      setChannels(list);
      if (list[0] && !salesChannelId) setSalesChannelId(list[0].id);
    })().catch(() => undefined);
  }, []);

  async function uploadThumbnail(): Promise<string | undefined> {
    if (!thumbnailFile) return undefined;
    const form = new FormData();
    form.append("files", thumbnailFile);
    const res = await fetch("/admin/uploads", {
      method: "POST",
      credentials: "include",
      body: form,
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.message || "Thumbnail upload failed");
    }
    const body = await res.json();
    return body.files?.[0]?.url as string | undefined;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const thumbnailUrl = await uploadThumbnail();
      const res = await fetch("/admin/books", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
          status,
          salesChannelId,
          thumbnailUrl,
          imageUrls: thumbnailUrl ? [thumbnailUrl] : undefined,
          paperPrice: Number(paperPrice),
          digitalPrice: Number(digitalPrice),
          paperInventoryQty: Number(paperInventoryQty),
          currencyCode: "egp",
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body.message || `Create failed (${res.status})`);
      }
      toast.success("Book created");
      navigate(`/products/${body.product.id}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <Heading level="h1">Create Book</Heading>
          <Text size="small" className="text-ui-fg-subtle">
            Creates a Book-type product with Paper and Digital variants ready
            for pricing and inventory.
          </Text>
        </div>
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-4 px-6 py-4 max-w-xl">
        <div className="flex flex-col gap-2">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Book title"
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional"
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label>Status</Label>
          <Select
            value={status}
            onValueChange={(v) => setStatus(v as "draft" | "published")}
          >
            <Select.Trigger>
              <Select.Value />
            </Select.Trigger>
            <Select.Content>
              <Select.Item value="draft">Draft</Select.Item>
              <Select.Item value="published">Published</Select.Item>
            </Select.Content>
          </Select>
        </div>

        <div className="flex flex-col gap-2">
          <Label>Sales channel</Label>
          <Select
            value={salesChannelId}
            onValueChange={setSalesChannelId}
            disabled={!channels.length}
          >
            <Select.Trigger>
              <Select.Value placeholder="Select channel" />
            </Select.Trigger>
            <Select.Content>
              {channels.map((c) => (
                <Select.Item key={c.id} value={c.id}>
                  {c.name}
                </Select.Item>
              ))}
            </Select.Content>
          </Select>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="thumbnail">Cover image</Label>
          <Input
            id="thumbnail"
            type="file"
            accept="image/*"
            onChange={(e) => setThumbnailFile(e.target.files?.[0] ?? null)}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="paperPrice">Paper price (EGP)</Label>
            <Input
              id="paperPrice"
              type="number"
              min="0.01"
              step="0.01"
              required
              value={paperPrice}
              onChange={(e) => setPaperPrice(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="paperQty">Paper inventory</Label>
            <Input
              id="paperQty"
              type="number"
              min="0"
              step="1"
              required
              value={paperInventoryQty}
              onChange={(e) => setPaperInventoryQty(e.target.value)}
            />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="digitalPrice">Digital price (EGP)</Label>
          <Input
            id="digitalPrice"
            type="number"
            min="0.01"
            step="0.01"
            required
            value={digitalPrice}
            onChange={(e) => setDigitalPrice(e.target.value)}
          />
        </div>

        {error ? (
          <Text size="small" className="text-ui-fg-error">
            {error}
          </Text>
        ) : null}

        <div className="flex gap-2 pt-2">
          <Button type="submit" isLoading={submitting} disabled={submitting}>
            Create book
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => navigate("/products")}
          >
            Cancel
          </Button>
        </div>
      </form>
    </Container>
  );
};

export const config = defineRouteConfig({
  label: "Create Book",
  nested: "/products",
});

export default CreateBookPage;
