"use client";

import { usePrefetchRecentlyViewed } from "@/hooks/usePrefetchRecentlyViewed";

export default function PrefetchManager() {
  usePrefetchRecentlyViewed();
  return null; // Este componente no renderiza nada
}
