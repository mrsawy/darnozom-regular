import { defineWidgetConfig } from "@medusajs/admin-sdk";
import type { AdminProduct, DetailWidgetProps } from "@medusajs/framework/types";
import { Container, Heading, Text } from "@medusajs/ui";
import { VariantFiles } from "../components/digital-files";

const DigitalFilesWidget = ({ data: product }: DetailWidgetProps<AdminProduct>) => {
  const digitalVariants = (product.variants ?? []).filter(
    (v) => (v.metadata as { kind?: string } | null)?.kind === "digital",
  );
  if (digitalVariants.length === 0) return null;

  return (
    <Container className="divide-y p-0">
      <div className="px-6 py-4">
        <Heading level="h2">Digital files</Heading>
        <Text size="small" className="text-ui-fg-subtle">
          Files buyers get in their library once their payment is confirmed.
        </Text>
      </div>
      {digitalVariants.map((v) => (
        <VariantFiles key={v.id} variantId={v.id} label={v.title ?? "Digital edition"} />
      ))}
    </Container>
  );
};

export const config = defineWidgetConfig({
  zone: "product.details.after",
});

export default DigitalFilesWidget;
