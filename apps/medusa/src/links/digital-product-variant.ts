import { defineLink } from "@medusajs/framework/utils";
import ProductModule from "@medusajs/medusa/product";
import DigitalProductModule from "../modules/digital-product";

export default defineLink(
  ProductModule.linkable.productVariant,
  DigitalProductModule.linkable.digitalProductFile,
);
