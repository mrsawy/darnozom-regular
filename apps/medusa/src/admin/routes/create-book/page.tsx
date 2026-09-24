import { defineRouteConfig } from "@medusajs/admin-sdk";
import {
  Button,
  Container,
  Heading,
  Input,
  Label,
  Select,
  Switch,
  Text,
  Textarea,
  toast,
} from "@medusajs/ui";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  DIGITAL_FILES_HINT,
  formatSize,
  uploadDigitalFiles,
} from "../../components/digital-files";

type SalesChannel = { id: string; name: string };
type ProductCategory = {
  id: string;
  name: string;
  handle: string;
  metadata?: Record<string, unknown> | null;
};

/** Default bookstore categories — created in Medusa if missing. */
const BOOK_CATEGORY_SEEDS = [
  { name: "Shariah", handle: "shariah", nameAr: "الشريعة" },
  { name: "Management", handle: "management", nameAr: "الإدارة" },
  {
    name: "Digital Transformation",
    handle: "digital-transformation",
    nameAr: "التحول الرقمي",
  },
] as const;

async function ensureBookCategories(): Promise<ProductCategory[]> {
  const listRes = await fetch("/admin/product-categories?limit=100", {
    credentials: "include",
  });
  if (!listRes.ok) return [];
  const listBody = await listRes.json();
  let cats: ProductCategory[] = listBody.product_categories ?? [];

  for (const seed of BOOK_CATEGORY_SEEDS) {
    const existing = cats.find(
      (c) =>
        c.handle === seed.handle ||
        ((c.metadata as Record<string, unknown> | null)?.darnozom === "book" &&
          c.handle === seed.handle),
    );
    if (existing) continue;
    const createRes = await fetch("/admin/product-categories", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: seed.name,
        handle: seed.handle,
        is_active: true,
        is_internal: false,
        metadata: { darnozom: "book", name_ar: seed.nameAr },
      }),
    });
    if (createRes.ok) {
      const created = await createRes.json();
      if (created.product_category) cats.push(created.product_category);
    }
  }

  // Refresh so we have ids for ones we just created / already tagged.
  const refresh = await fetch("/admin/product-categories?limit=100", {
    credentials: "include",
  });
  if (refresh.ok) {
    const body = await refresh.json();
    cats = body.product_categories ?? cats;
  }

  const bookCats = cats.filter(
    (c) =>
      (c.metadata as Record<string, unknown> | null)?.darnozom === "book" ||
      BOOK_CATEGORY_SEEDS.some((s) => s.handle === c.handle),
  );
  return bookCats.length ? bookCats : cats;
}

const CreateBookPage = () => {
  const navigate = useNavigate();
  const [channels, setChannels] = useState<SalesChannel[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [author, setAuthor] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [status, setStatus] = useState<"draft" | "published">("draft");
  const [salesChannelId, setSalesChannelId] = useState("");
  const [paperPrice, setPaperPrice] = useState("");
  const [digitalPrice, setDigitalPrice] = useState("");
  const [paperInventoryQty, setPaperInventoryQty] = useState("20");
  // Book images in display order; the first one is the cover.
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [hasDigital, setHasDigital] = useState(true);
  const [digitalFiles, setDigitalFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const [chRes, bookCats] = await Promise.all([
        fetch("/admin/sales-channels?limit=50", { credentials: "include" }),
        ensureBookCategories(),
      ]);
      if (chRes.ok) {
        const body = await chRes.json();
        const list: SalesChannel[] = body.sales_channels ?? [];
        setChannels(list);
        if (list[0]) setSalesChannelId(list[0].id);
      }
      setCategories(bookCats);
      if (bookCats[0]) setCategoryId(bookCats[0].id);
    })().catch(() => undefined);
  }, []);

  const imagePreviews = useMemo(
    () => imageFiles.map((f) => URL.createObjectURL(f)),
    [imageFiles],
  );
  useEffect(
    () => () => imagePreviews.forEach((u) => URL.revokeObjectURL(u)),
    [imagePreviews],
  );

  function makeCover(index: number) {
    setImageFiles((list) => [list[index], ...list.filter((_, i) => i !== index)]);
  }

  /** Uploads every image; returns their URLs in the same order. */
  async function uploadImages(): Promise<string[]> {
    if (!imageFiles.length) return [];
    const form = new FormData();
    for (const f of imageFiles) form.append("files", f);
    const res = await fetch("/admin/uploads", {
      method: "POST",
      credentials: "include",
      body: form,
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.message || "Image upload failed");
    }
    const body = await res.json();
    return ((body.files ?? []) as { url: string }[]).map((f) => f.url);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const imageUrls = await uploadImages();
      const selected = categories.find((c) => c.id === categoryId);
      const res = await fetch("/admin/books", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
          author: author.trim() || undefined,
          categoryIds: categoryId ? [categoryId] : undefined,
          // Legacy metadata mirror of the Medusa category handle (without dashes).
          category: selected?.handle?.replace(/-/g, "_"),
          status,
          salesChannelId,
          thumbnailUrl: imageUrls[0],
          imageUrls: imageUrls.length ? imageUrls : undefined,
          paperPrice: Number(paperPrice),
          hasDigital,
          digitalPrice: hasDigital ? Number(digitalPrice) : undefined,
          paperInventoryQty: Number(paperInventoryQty),
          currencyCode: "egp",
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body.message || `Create failed (${res.status})`);
      }
      if (hasDigital && digitalFiles.length && body.digitalVariantId) {
        try {
          await uploadDigitalFiles(body.digitalVariantId, digitalFiles);
        } catch (uploadErr) {
          // The book exists; files can be re-added from its Digital variant.
          toast.warning("Book created, but some digital files failed to upload", {
            description: `${(uploadErr as Error).message}. Add them from the product page.`,
          });
          navigate(`/products/${body.product.id}`);
          return;
        }
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
            Creates a Book-type product with a Paper variant and, optionally, a
            Digital variant with its downloadable files. Category uses Medusa
            product categories (same filters as the storefront).
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
          <Label htmlFor="author">Author</Label>
          <Input
            id="author"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            placeholder="Optional — used by storefront search"
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label>Category (Medusa)</Label>
          <Select
            value={categoryId}
            onValueChange={setCategoryId}
            disabled={!categories.length}
          >
            <Select.Trigger>
              <Select.Value placeholder="Select category" />
            </Select.Trigger>
            <Select.Content>
              {categories.map((c) => (
                <Select.Item key={c.id} value={c.id}>
                  {c.name}
                </Select.Item>
              ))}
            </Select.Content>
          </Select>
          <Text size="small" className="text-ui-fg-subtle">
            Managed in Medusa Admin → Categories. Storefront filters use these.
          </Text>
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
          <Label htmlFor="images">Images</Label>
          <Input
            id="images"
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => {
              const picked = Array.from(e.target.files ?? []);
              if (picked.length) setImageFiles((list) => [...list, ...picked]);
              e.target.value = "";
            }}
          />
          <Text size="small" className="text-ui-fg-subtle">
            Add as many as you like. The first image is the cover.
          </Text>
          {imageFiles.length > 0 && (
            <div className="grid grid-cols-4 gap-2">
              {imageFiles.map((f, i) => (
                <div key={`${f.name}-${i}`} className="flex flex-col gap-1">
                  <div className="relative aspect-square overflow-hidden rounded border">
                    <img
                      src={imagePreviews[i]}
                      alt={f.name}
                      className="h-full w-full object-cover"
                    />
                    {i === 0 && (
                      <span className="absolute left-1 top-1 rounded bg-ui-bg-base px-1 text-xs">
                        Cover
                      </span>
                    )}
                  </div>
                  <div className="flex gap-1">
                    {i > 0 && (
                      <Button
                        type="button"
                        size="small"
                        variant="transparent"
                        onClick={() => makeCover(i)}
                      >
                        Make cover
                      </Button>
                    )}
                    <Button
                      type="button"
                      size="small"
                      variant="transparent"
                      onClick={() =>
                        setImageFiles((list) => list.filter((_, j) => j !== i))
                      }
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
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

        <div className="flex items-center gap-x-3">
          <Switch
            id="hasDigital"
            checked={hasDigital}
            onCheckedChange={setHasDigital}
          />
          <Label htmlFor="hasDigital">This book has a digital edition</Label>
        </div>

        {hasDigital && (
          <div className="flex flex-col gap-4 rounded border p-4">
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
            <div className="flex flex-col gap-2">
              <Label htmlFor="digitalFiles">Digital files</Label>
              <Input
                id="digitalFiles"
                type="file"
                multiple
                onChange={(e) => {
                  const picked = Array.from(e.target.files ?? []);
                  if (picked.length) setDigitalFiles((list) => [...list, ...picked]);
                  e.target.value = "";
                }}
              />
              <Text size="small" className="text-ui-fg-subtle">
                What buyers get in their library once payment is confirmed.{" "}
                {DIGITAL_FILES_HINT} You can also add or change files later on
                the Digital variant.
              </Text>
              {digitalFiles.map((f, i) => (
                <div key={`${f.name}-${i}`} className="flex items-center gap-x-2">
                  <Text size="small" className="flex-1 truncate">
                    {f.name}
                  </Text>
                  <Text size="small" className="text-ui-fg-subtle">
                    {formatSize(f.size)}
                  </Text>
                  <Button
                    type="button"
                    size="small"
                    variant="transparent"
                    onClick={() =>
                      setDigitalFiles((list) => list.filter((_, j) => j !== i))
                    }
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

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
