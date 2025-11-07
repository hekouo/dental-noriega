import FeaturedCard from "@/components/FeaturedCard";
import FeaturedCardControlsLazy from "@/components/FeaturedCardControls.lazy.client";
import { hasPurchasablePrice } from "@/lib/catalog/model";
import type { FeaturedItem } from "@/lib/catalog/getFeatured.server";

export default function FeaturedGrid({ items }: { items: FeaturedItem[] }) {
  if (!items?.length) return null;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {items.map((item, index) => (
        <FeaturedCard
          key={item.product_id}
          item={item}
          priority={index < 4}
          sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
          controls={
            hasPurchasablePrice(item) ? (
              <FeaturedCardControlsLazy item={item} compact />
            ) : (
              <p className="text-sm text-muted-foreground">Agotado</p>
            )
          }
        />
      ))}
    </div>
  );
}
