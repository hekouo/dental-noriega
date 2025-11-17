// src/components/FeaturedCard.tsx
"use client";
import ProductCard from "@/components/catalog/ProductCard";
import type { FeaturedItem } from "@/lib/catalog/getFeatured.server";
import type { ProductCardProps } from "@/components/catalog/ProductCard";

type Props = {
  item: FeaturedItem;
  priority?: boolean;
  sizes?: string;
};

/**
 * Adaptador para FeaturedItem -> ProductCardProps
 */
function toProductCardProps(
  item: FeaturedItem,
  priority?: boolean,
  sizes?: string,
): ProductCardProps {
  return {
    id: item.product_id,
    section: item.section,
    product_slug: item.product_slug,
    title: item.title,
    price_cents: item.price_cents,
    image_url: item.image_url,
    in_stock: item.in_stock,
    is_active: item.is_active,
    description: item.description,
    priority,
    sizes,
  };
}

/**
 * FeaturedCard: wrapper que usa ProductCard canónico
 * ProductCard ya incluye todos los controles necesarios (cantidad + agregar + WhatsApp)
 * @deprecated Usar ProductCard directamente cuando sea posible
 */
export default function FeaturedCard({
  item,
  priority = false,
  sizes,
}: Props) {
  // Siempre usar ProductCard directamente - ya incluye todos los controles
  return <ProductCard {...toProductCardProps(item, priority, sizes)} />;
}
