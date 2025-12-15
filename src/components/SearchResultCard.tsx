// src/components/SearchResultCard.tsx
"use client";
import ProductCard from "@/components/catalog/ProductCard";
import type { CatalogItem } from "@/lib/supabase/catalog";
import type { ProductCardProps } from "@/components/catalog/ProductCard";
import { trackSearchClickResult } from "@/lib/analytics/events";

type Props = {
  item: CatalogItem;
  highlightQuery?: string;
  position?: number;
};

/**
 * Adaptador para CatalogItem -> ProductCardProps con highlight
 */
function toProductCardProps(item: CatalogItem, highlightQuery?: string): ProductCardProps {
  return {
    id: item.id,
    section: item.section,
    product_slug: item.product_slug,
    title: item.title,
    price_cents: item.price_cents,
    image_url: item.image_url,
    in_stock: item.in_stock,
    is_active: item.is_active,
    highlightQuery,
  };
}

/**
 * SearchResultCard: wrapper que usa ProductCard canónico con highlight
 */
export default function SearchResultCard({ item, highlightQuery, position }: Props) {
  const handleClick = () => {
    if (highlightQuery && position !== undefined) {
      trackSearchClickResult({
        query: highlightQuery,
        productId: item.id,
        sectionSlug: item.section,
        position,
      });
    }
  };

  return (
    <div onClick={handleClick}>
      <ProductCard {...toProductCardProps(item, highlightQuery)} compact />
    </div>
  );
}
