"use client";

import { useEffect } from "react";
import { addRecentlyViewed } from "@/lib/catalog/recentlyViewed.client";
import type { RecentlyViewedItem } from "@/lib/catalog/recentlyViewed.client";

type Props = {
  product: {
    id: string;
    section: string;
    slug: string;
    title: string;
    priceCents?: number | null;
    image_url?: string | null;
    inStock?: boolean | null;
  };
};

/**
 * Componente client que registra un producto como visto recientemente
 * Se usa en la PDP para guardar el producto actual en localStorage
 */
export default function RecentlyViewedTracker({ product }: Props) {
  useEffect(() => {
    const item: RecentlyViewedItem = {
      id: product.id,
      section: product.section,
      slug: product.slug,
      title: product.title,
      priceCents: product.priceCents ?? null,
      image_url: product.image_url ?? null,
      inStock: product.inStock ?? null,
    };

    addRecentlyViewed(item);
  }, [product.id, product.section, product.slug, product.title, product.priceCents, product.image_url, product.inStock]);

  // Componente invisible, solo registra en localStorage
  return null;
}

