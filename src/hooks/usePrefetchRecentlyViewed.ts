"use client";

import { useRouter } from "next/navigation";
import { useRecentlyViewed } from "./useRecentlyViewed";
import { useEffect } from "react";
import { ROUTES } from "@/lib/routes";

export function usePrefetchRecentlyViewed() {
  const router = useRouter();
  const { getItemsForPrefetch } = useRecentlyViewed();

  useEffect(() => {
    // Prefetch los primeros 4 productos vistos recientemente
    const itemsToPrefetch = getItemsForPrefetch(4);
    
    itemsToPrefetch.forEach(item => {
      const productUrl = ROUTES.product(item.sectionSlug, item.slug);
      router.prefetch(productUrl);
    });
  }, [router, getItemsForPrefetch]);
}
