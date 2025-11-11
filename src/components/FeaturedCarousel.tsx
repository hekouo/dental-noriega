"use client";

import FeaturedCard from "@/components/FeaturedCard";
import FeaturedCardControlsLazy from "@/components/FeaturedCardControls.lazy.client";
import { hasPurchasablePrice } from "@/lib/catalog/model";
import type { FeaturedItem } from "@/lib/catalog/getFeatured.server";

export default function FeaturedCarousel({ items }: { items: FeaturedItem[] }) {
  if (!items?.length) return null;

  return (
    <div className="w-full overflow-x-auto no-scrollbar py-3">
      <div className="flex gap-4 min-w-max">
        {items.map((item, index) => (
          <div key={item.product_id} className="flex-shrink-0 w-64">
            <FeaturedCard
              item={item}
              priority={index === 0}
              sizes="(max-width: 768px) 90vw, 50vw"
              controls={
                (() => {
                  const soldOut = !(item.is_active ?? true) || !(item.in_stock ?? false);
                  return !soldOut && hasPurchasablePrice(item) ? (
                    <FeaturedCardControlsLazy item={item} compact />
                  ) : soldOut ? (
                    <p className="text-sm text-muted-foreground">Agotado</p>
                  ) : null;
                })()
              }
            />
          </div>
        ))}
      </div>
    </div>
  );
}
