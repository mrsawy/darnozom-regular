import { defineWidgetConfig } from "@medusajs/admin-sdk";
import { Button, Container, Heading, Text } from "@medusajs/ui";
import { Link } from "react-router-dom";

const CreateBookListWidget = () => {
  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <Heading level="h2">Create Book</Heading>
          <Text size="small" className="text-ui-fg-subtle">
            Start with Paper + Digital variants already set (Book product type).
          </Text>
        </div>
        <Link to="/create-book">
          <Button>Create Book</Button>
        </Link>
      </div>
    </Container>
  );
};

export const config = defineWidgetConfig({
  zone: "product.list",
});

export default CreateBookListWidget;
