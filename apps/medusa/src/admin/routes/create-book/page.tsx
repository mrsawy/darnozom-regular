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
import { BookProfileFields } from "../../components/book-profile-fields";
import { CategoryPicker } from "../../components/category-picker";
import { EMPTY_PROFILE_FORM, toProfilePayload, type BookProfileFormValue } from "../../lib/book-profile-form";

type SalesChannel = { id: string; name: string };

const CreateBookPage = () => {
  const navigate = useNavigate();
  const [channels, setChannels] = useState<SalesChannel[]>([]);
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [description, setDescription] = useState("");
  const [profile, setProfile] = useState<BookProfileFormValue>(EMPTY_PROFILE_FORM);
  const [additionalCategoryIds, setAdditionalCategoryIds] = useState<string[]>([]);
  const [status, setStatus] = useState<"draft" | "published">("draft");
  const [salesChannelId, setSalesChannelId] = useState("");
  const [hasPrint, setHasPrint] = useState(true);
  const [paperPrice, setPaperPrice] = useState("");
  const [digitalPrice, setDigitalPrice] = useState("");
  const [paperInventoryQty, setPaperInventoryQty] = useState("20");
  // Book images in display order; the first one is the cover.
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [hasDigital, setHasDigital] = useState(false);
  const [digitalFiles, setDigitalFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const chRes = await fetch("/admin/sales-channels?limit=50", { credentials: "include" });
      if (chRes.ok) {
        const body = await chRes.json();
        const list: SalesChannel[] = body.sales_channels ?? [];
        setChannels(list);
        if (list[0]) setSalesChannelId(list[0].id);
      }
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
      const res = await fetch("/admin/books", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          subtitle: subtitle.trim() || null,
          description: description.trim() || null,
          status,
          sales_channel_id: salesChannelId,
          image_urls: imageUrls,
          additional_category_ids: additionalCategoryIds,
          print: hasPrint ? { price: Number(paperPrice), stock: Number(paperInventoryQty) } : null,
          digital: hasDigital ? { price: Number(digitalPrice) } : null,
          profile: toProfilePayload(profile),
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error((body.errors as string[] | undefined)?.join("\n") || body.message || `Create failed (${res.status})`);
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
            Creates a Book-type product: print, digital or both — each with
            its own price and availability.
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
          <Label htmlFor="subtitle">Subtitle</Label>
          <Input
            id="subtitle"
            value={subtitle}
            onChange={(e) => setSubtitle(e.target.value)}
            placeholder="Optional"
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
          <Text size="small" className="text-ui-fg-subtle">
            A professional text: the book's subject, main themes, scholarly
            significance and who it is for.
          </Text>
        </div>

        <CategoryPicker
          primaryId={profile.primary_category_id}
          additionalIds={additionalCategoryIds}
          onPrimaryChange={(id) => setProfile({ ...profile, primary_category_id: id })}
          onAdditionalChange={setAdditionalCategoryIds}
        />

        <BookProfileFields value={profile} onChange={setProfile} />

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

        <div className="flex items-center gap-x-3">
          <Switch id="hasPrint" checked={hasPrint} onCheckedChange={setHasPrint} />
          <Label htmlFor="hasPrint">Sell a print edition</Label>
        </div>
        {hasPrint && (
          <div className="grid grid-cols-2 gap-4 rounded border p-4">
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
        )}

        <div className="flex items-center gap-x-3">
          <Switch
            id="hasDigital"
            checked={hasDigital}
            disabled={!profile.digital_rights}
            onCheckedChange={setHasDigital}
          />
          <Label htmlFor="hasDigital">Sell a digital edition</Label>
        </div>
        {!profile.digital_rights && (
          <Text size="small" className="text-ui-fg-subtle">
            Tick "Digital distribution rights are available" above to sell a digital edition.
          </Text>
        )}

        {hasDigital && profile.digital_rights && (
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
