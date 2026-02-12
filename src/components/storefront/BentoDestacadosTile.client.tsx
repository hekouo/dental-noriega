"use client";

import ProductRail from "./ProductRail";
import type { FeaturedItem } from "@/lib/catalog/getFeatured.server";

type Props = {
  items: FeaturedItem[];
};

/**
 * Tile bento: rail corto de destacados (solo UI).
 */
export default function BentoDestacadosTile({ items }: Props) {
  if (!items?.length) {
    return (
      <div className="rounded-xl border border-stone-200/90 dark:border-gray-700 bg-stone-50/80 dark:bg-gray-800/50 p-4 flex items-center justify-center min-h-[200px]">
        <p className="text-sm text-stone-500 dark:text-gray-400">Pronto más destacados</p>
      </div>
    );
  }

  const slice = items.slice(0, 6);
  return (
    <div className="rounded-xl border border-stone-200/90 dark:border-gray-700 bg-white dark:bg-gray-800/80 overflow-hidden h-full min-h-[280px]">
      <ProductRail items={slice} title="Destacados" showPrevNext={false} className="h-full" />
    </div>
  );
}
