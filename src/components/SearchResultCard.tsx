// src/components/SearchResultCard.tsx
"use client";
import ProductCard from "@/components/catalog/ProductCard";
import ProductCardV2 from "@/components/catalog/ProductCardV2";
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

/** Datos mínimos para usar V2; si falta algo, fallback a card canónica */
function hasMinDataForV2(item: CatalogItem): boolean {
  return !!(
    item &&
    typeof item.id === "string" &&
    typeof item.section === "string" &&
    typeof item.product_slug === "string" &&
    typeof item.title === "string"
  );
}

/**
 * SearchResultCard: en /buscar usa ProductCardV2 (premium); fallback a ProductCard si faltan datos.
 */
export default function SearchResultCard({ item, highlightQuery, position }: Props) {
  const handleClick = () => {
    if (highlightQuery && position !== undefined && item?.id) {
      trackSearchClickResult({
        query: highlightQuery,
        productId: item.id,
        sectionSlug: item.section,
        position,
      });
    }
  };

  const props = toProductCardProps(item, highlightQuery);

  if (!hasMinDataForV2(item)) {
    return (
      <div onClick={handleClick}>
        <ProductCard {...props} compact />
      </div>
    );
  }

  return (
    <div onClick={handleClick}>
      <ProductCardV2 {...props} />
    </div>
  );
}
