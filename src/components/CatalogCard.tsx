"use client";
import ProductCard from "@/components/catalog/ProductCard";
import type { CatalogItem } from "@/lib/supabase/catalog";
import type { ProductCardProps } from "@/components/catalog/ProductCard";

/**
 * Adaptador para CatalogItem -> ProductCardProps
 */
function toProductCardProps(item: CatalogItem): ProductCardProps {
  return {
    id: item.id,
    section: item.section,
    product_slug: item.product_slug,
    title: item.title,
    price_cents: item.price_cents,
    image_url: item.image_url,
    in_stock: item.in_stock,
    is_active: item.is_active,
  };
}

/**
 * CatalogCard: wrapper que usa ProductCard canónico
 * @deprecated Usar ProductCard directamente cuando sea posible
 */
export function CatalogCard({ item }: { item: CatalogItem }) {
  return <ProductCard {...toProductCardProps(item)} compact />;
}
