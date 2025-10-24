"use client";

import { useRecentlyViewed } from "@/hooks/useRecentlyViewed";
import { useEffect } from "react";

type Props = {
  slug: string;
  title: string;
  section: string;
  sectionSlug: string;
  price: number;
  image?: string;
};

export function RecentlyViewedTracker({
  slug,
  title,
  section,
  sectionSlug,
  price,
  image,
}: Props) {
  const { addItem } = useRecentlyViewed();

  useEffect(() => {
    addItem({
      slug,
      title,
      section,
      sectionSlug,
      price,
      image,
    });
  }, [addItem, slug, title, section, sectionSlug, price, image]);

  return null; // Este componente no renderiza nada
}
