import ProductCard from "@/components/catalog/ProductCard";
import type { FeaturedItem } from "@/lib/catalog/getFeatured.server";
import type { ProductCardProps } from "@/components/catalog/ProductCard";

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

export default function FeaturedGrid({ 
  items, 
  hideSoldOutLabel = false 
}: { 
  items: FeaturedItem[]; 
  hideSoldOutLabel?: boolean;
}) {
  if (!items?.length) return null;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {items.map((item, index) => (
        <ProductCard
          key={item.product_id}
          {...toProductCardProps(
            item,
            index < 4, // priority para primeros 4
            "(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
          )}
        />
      ))}
    </div>
  );
}
