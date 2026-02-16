"use client";

import { useRef } from "react";
import ProductCard from "@/components/catalog/ProductCard";
import type { FeaturedItem } from "@/lib/catalog/getFeatured.server";
import type { ProductCardProps } from "@/components/catalog/ProductCard";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { usePrefersReducedMotion } from "@/lib/hooks/usePrefersReducedMotion";
import { cn } from "@/lib/utils";

const CARD_WIDTH = 200;
const SCROLL_OFFSET = 220;

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
    variant: "compact",
  };
}

export type ProductsRailProps = {
  items: FeaturedItem[];
  title?: string;
  className?: string;
};

/**
 * Rail horizontal compacto para destacados: scroll-snap, flechas solo desktop.
 * Reduced motion: scroll con behavior 'auto' (sin smooth).
 */
export default function ProductsRail({
  items,
  title = "Destacados",
  className,
}: ProductsRailProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = usePrefersReducedMotion();

  if (!items?.length) return null;

  const scroll = (direction: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    const offset = direction === "left" ? -SCROLL_OFFSET : SCROLL_OFFSET;
    el.scrollBy({
      left: offset,
      behavior: prefersReducedMotion ? "auto" : "smooth",
    });
  };

  return (
    <section
      className={cn("relative max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-10", className)}
      aria-labelledby="products-rail-title"
    >
      <div className="flex items-center justify-between gap-4 mb-4">
        <h2
          id="products-rail-title"
          className="text-xl sm:text-2xl font-semibold tracking-tight text-gray-900 dark:text-white"
        >
          {title}
        </h2>
        {/* Flechas solo desktop */}
        {items.length > 1 && (
          <div
            className="hidden md:flex items-center gap-1 shrink-0"
            aria-hidden
          >
            <button
              type="button"
              onClick={() => scroll("left")}
              className="p-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 min-h-[44px] min-w-[44px] inline-flex items-center justify-center"
              aria-label="Anterior"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={() => scroll("right")}
              className="p-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 min-h-[44px] min-w-[44px] inline-flex items-center justify-center"
              aria-label="Siguiente"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>

      <div
        ref={scrollRef}
        className="overflow-x-auto overflow-y-hidden pb-2 -mx-1 px-1 snap-x snap-mandatory scrollbar-hide"
        style={{
          scrollbarWidth: "none",
          msOverflowStyle: "none",
          scrollPaddingLeft: "1rem",
          scrollPaddingRight: "1rem",
        }}
      >
        <div className="flex gap-4 w-max">
          {items.map((item, index) => (
            <div
              key={item.product_id}
              className="flex-shrink-0 snap-start"
              style={{ minWidth: CARD_WIDTH }}
            >
              <ProductCard
                {...toProductCardProps(
                  item,
                  index < 3,
                  "(max-width: 768px) 45vw, 200px"
                )}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
