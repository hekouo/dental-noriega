import FeaturedCard from "@/components/FeaturedCard";
import type { FeaturedItem } from "@/lib/catalog/getFeatured.server";

export default function FeaturedGrid({ items }: { items: FeaturedItem[] }) {
  if (!items?.length) return null;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {items.map((item) => (
        <FeaturedCard key={item.product_id} item={item} />
      ))}
    </div>
  );
}
