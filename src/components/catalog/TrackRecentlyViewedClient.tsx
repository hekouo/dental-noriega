"use client";

import { useTrackRecentlyViewed } from "./RecentlyViewed";

type Props = {
  product: {
    id: string;
    section: string;
    slug: string;
    title: string;
    priceCents: number;
    image_url: string | null;
    inStock: boolean | null;
  };
};

export function TrackRecentlyViewedClient({ product }: Props) {
  useTrackRecentlyViewed({
    id: product.id,
    section: product.section,
    product_slug: product.slug,
    title: product.title,
    image_url: product.image_url,
    price_cents: product.priceCents,
  });

  // Componente no renderiza nada, solo trackea
  return null;
}

