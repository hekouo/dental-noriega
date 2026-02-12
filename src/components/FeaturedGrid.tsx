"use client";

import { useEffect, useRef } from "react";
import ProductCard from "@/components/catalog/ProductCard";
import ProductCardV2 from "@/components/catalog/ProductCardV2";
import type { FeaturedItem } from "@/lib/catalog/getFeatured.server";
import type { ProductCardProps } from "@/components/catalog/ProductCard";
import { trackRelatedProductsShown, trackRelatedProductClicked } from "@/lib/analytics/events";

/** Flag: usar ProductCardV2 en FeaturedGrid (tienda + destacados). Default false. */
const FEATURE_CARD_V2 =
  typeof process.env.NEXT_PUBLIC_FEATURE_CARD_V2 !== "undefined" &&
  process.env.NEXT_PUBLIC_FEATURE_CARD_V2 === "true";

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

/** Datos mínimos para renderizar V2; si falta algo, fallback a ProductCard (no null). */
function hasMinDataForFeaturedV2(item: FeaturedItem): boolean {
  return !!(
    item &&
    typeof item.product_id === "string" &&
    typeof item.section === "string" &&
    typeof item.product_slug === "string" &&
    typeof item.title === "string"
  );
}

type FeaturedGridProps = {
  items: FeaturedItem[];
  hideSoldOutLabel?: boolean;
  source?: "cart" | "checkout" | "search_no_results" | "search_low_results";
  query?: string;
  cartItemsCount?: number;
};

export default function FeaturedGrid({ 
  items,
  hideSoldOutLabel: _hideSoldOutLabel = false,
  source,
  query,
  cartItemsCount,
}: FeaturedGridProps) {
  const trackedRef = useRef(false);

  useEffect(() => {
    if (source && items.length > 0 && !trackedRef.current) {
      trackedRef.current = true;
      trackRelatedProductsShown({
        source,
        productsCount: items.length,
        cartItemsCount,
        query,
      });
    }
  }, [source, items.length, cartItemsCount, query]);

  if (!items?.length) return null;

  const handleProductClick = (item: FeaturedItem, position: number) => {
    if (source) {
      trackRelatedProductClicked({
        source,
        productId: item.product_id,
        sectionSlug: item.section,
        position,
      });
    }
  };

  const useV2 = FEATURE_CARD_V2;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-5 items-start min-w-0">
      {items.map((item, index) => {
        const props = toProductCardProps(
          item,
          index < 4,
          "(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw",
        );
        const showV2 = useV2 && hasMinDataForFeaturedV2(item);
        return (
          <div
            key={item.product_id}
            className="min-w-0"
            onClick={() => handleProductClick(item, index + 1)}
            style={{ "--delay": `${index * 50}ms` } as React.CSSProperties}
          >
            {showV2 ? <ProductCardV2 {...props} /> : <ProductCard {...props} />}
          </div>
        );
      })}
    </div>
  );
}
