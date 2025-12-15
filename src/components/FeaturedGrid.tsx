"use client";

import { useEffect, useRef } from "react";
import ProductCard from "@/components/catalog/ProductCard";
import type { FeaturedItem } from "@/lib/catalog/getFeatured.server";
import type { ProductCardProps } from "@/components/catalog/ProductCard";
import { trackRelatedProductsShown, trackRelatedProductClicked } from "@/lib/analytics/events";

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

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {items.map((item, index) => (
        <div
          key={item.product_id}
          onClick={() => handleProductClick(item, index + 1)}
        >
          <ProductCard
            {...toProductCardProps(
              item,
              index < 4, // priority para primeros 4
              "(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
            )}
          />
        </div>
      ))}
    </div>
  );
}
