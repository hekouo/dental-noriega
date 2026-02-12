"use client";

import React, { useRef } from "react";
import ProductCard from "@/components/catalog/ProductCard";
import type { FeaturedItem } from "@/lib/catalog/getFeatured.server";
import type { ProductCardProps } from "@/components/catalog/ProductCard";
import { ChevronLeft, ChevronRight } from "lucide-react";

const CARD_MIN_WIDTH = 260;
const SCROLL_OFFSET = 280;

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

export type ProductRailProps = {
  items: FeaturedItem[];
  title?: string;
  showPrevNext?: boolean;
  /** Clase adicional para el contenedor del rail */
  className?: string;
};

/**
 * Rail horizontal de productos (overflow-x-auto + scroll-snap).
 * Reutiliza ProductCard. Botones prev/next opcionales, sin deps.
 */
export default function ProductRail({
  items,
  title,
  showPrevNext = true,
  className = "",
}: ProductRailProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  if (!items?.length) return null;

  const scroll = (direction: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    const offset = direction === "left" ? -SCROLL_OFFSET : SCROLL_OFFSET;
    el.scrollBy({ left: offset, behavior: "smooth" });
  };

  return (
    <section
      className={`relative ${className}`}
      aria-labelledby={title ? "product-rail-title" : undefined}
    >
      {(title || showPrevNext) && (
        <div className="flex items-center justify-between gap-4 mb-4">
          {title && (
            <h2
              id="product-rail-title"
              className="text-xl font-semibold tracking-tight text-gray-900 dark:text-white"
            >
              {title}
            </h2>
          )}
          {showPrevNext && items.length > 1 && (
            <div className="flex items-center gap-1 shrink-0" aria-hidden>
              <button
                type="button"
                onClick={() => scroll("left")}
                className="p-2 rounded-lg border border-stone-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-stone-700 dark:text-gray-300 hover:bg-stone-50 dark:hover:bg-gray-700 transition-colors focus-premium tap-feedback min-h-[44px] min-w-[44px] inline-flex items-center justify-center"
                aria-label="Anterior"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={() => scroll("right")}
                className="p-2 rounded-lg border border-stone-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-stone-700 dark:text-gray-300 hover:bg-stone-50 dark:hover:bg-gray-700 transition-colors focus-premium tap-feedback min-h-[44px] min-w-[44px] inline-flex items-center justify-center"
                aria-label="Siguiente"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      )}
      <div
        ref={scrollRef}
        className="overflow-x-auto overflow-y-hidden pb-2 -mx-1 px-1 scroll-smooth snap-x snap-mandatory no-scrollbar"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        <div className="flex gap-4 w-max">
          {items.map((item, index) => (
            <div
              key={item.product_id}
              className="flex-shrink-0 snap-start"
              style={{ minWidth: CARD_MIN_WIDTH }}
            >
              <ProductCard
                {...toProductCardProps(
                  item,
                  index < 3,
                  "(max-width: 640px) 70vw, 260px"
                )}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
