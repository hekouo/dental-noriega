"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ImageWithFallback from "@/components/ui/ImageWithFallback";
import { formatMXN, mxnFromCents } from "@/lib/utils/currency";
import { ROUTES } from "@/lib/routes";
import type { RecentlyViewedItem } from "@/lib/catalog/recentlyViewed.client";
import { getRecentlyViewed } from "@/lib/catalog/recentlyViewed.client";

/**
 * Componente que muestra productos vistos recientemente
 * Se autoalimenta desde localStorage y no requiere props
 */
export default function RecentlyViewed() {
  const [items, setItems] = useState<RecentlyViewedItem[]>([]);

  useEffect(() => {
    // Solo leer en el cliente
    const recent = getRecentlyViewed();
    setItems(recent);
  }, []);

  // No renderizar si no hay productos
  if (items.length === 0) {
    return null;
  }

  return (
    <section className="mt-12 pt-10 border-t border-gray-200 dark:border-gray-700 space-y-5">
      <div>
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
          Vistos recientemente
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Retoma productos que revisaste hace unos momentos.
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {items.map((item) => {
          const priceCents = item.priceCents ?? 0;
          const price = mxnFromCents(priceCents);
          const productUrl = ROUTES.product(item.section, item.slug);

          return (
            <Link
              key={item.id}
              href={productUrl}
              className="group block bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-md dark:hover:shadow-lg transition-shadow"
            >
              {/* Imagen */}
              <div className="relative w-full aspect-square bg-gray-50 dark:bg-gray-900">
                <ImageWithFallback
                  src={item.image_url}
                  alt={item.title}
                  width={400}
                  height={400}
                  className="w-full h-full object-contain"
                  sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                />
              </div>

              {/* Información */}
              <div className="p-4 space-y-2">
                <h3 className="font-medium text-sm text-gray-900 dark:text-white line-clamp-2 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                  {item.title}
                </h3>

                {/* Precio y stock */}
                <div className="flex items-center justify-between">
                  {priceCents > 0 ? (
                    <span className="text-lg font-semibold text-primary-600 dark:text-primary-400">
                      {formatMXN(price)}
                    </span>
                  ) : (
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      Consultar precio
                    </span>
                  )}

                  {item.inStock !== null && item.inStock !== undefined && (
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        item.inStock
                          ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
                          : "bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800"
                      }`}
                    >
                      {item.inStock ? "En stock" : "Agotado"}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

