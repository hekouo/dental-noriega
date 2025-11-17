// src/components/FeaturedCard.tsx
"use client";
import ProductCard from "@/components/catalog/ProductCard";
import type { FeaturedItem } from "@/lib/catalog/getFeatured.server";
import type { ProductCardProps } from "@/components/catalog/ProductCard";

type Props = {
  item: FeaturedItem;
  priority?: boolean;
  sizes?: string;
  controls?: React.ReactNode; // Mantener compatibilidad con controles custom si se necesitan
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
 * Si se pasa `controls`, se renderiza en lugar de los controles por defecto
 * @deprecated Usar ProductCard directamente cuando sea posible
 */
export default function FeaturedCard({
  item,
  priority = false,
  sizes,
  controls,
}: Props) {
  // Si hay controles custom, usar el layout antiguo (compatibilidad)
  if (controls) {
    // Mantener compatibilidad con código que pasa controles custom
    const props = toProductCardProps(item, priority, sizes);
    return (
      <div className="border rounded-xl overflow-hidden flex flex-col">
        <ProductCard {...props} />
        {controls}
      </div>
    );
  }

  // Usar ProductCard directamente
  return <ProductCard {...toProductCardProps(item, priority, sizes)} />;
}
