"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ProductCard from "./ProductCard";
import type { ProductCardProps } from "./ProductCard";

const STORAGE_KEY = "DDN_RECENTLY_VIEWED_V1";
const MAX_ITEMS = 8;

type RecentlyViewedItem = {
  id: string;
  title: string;
  section: string;
  product_slug: string;
  image_url: string | null;
  price_cents: number | null;
};

export function RecentlyViewed() {
  const [items, setItems] = useState<RecentlyViewedItem[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as RecentlyViewedItem[];
        if (Array.isArray(parsed)) {
          setItems(parsed.slice(0, MAX_ITEMS));
        }
      }
    } catch (err) {
      console.error("[RecentlyViewed] Error reading localStorage:", err);
      // Degradar sin errores
    }
  }, []);

  // No renderizar si no hay items
  if (items.length === 0) {
    return null;
  }

  // Convertir a ProductCardProps
  const cardProps: ProductCardProps[] = items.map((item) => ({
    id: item.id,
    section: item.section,
    product_slug: item.product_slug,
    title: item.title,
    price_cents: item.price_cents,
    image_url: item.image_url,
    in_stock: null,
    is_active: null,
    compact: true,
  }));

  return (
    <section className="py-8 sm:py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-6">
          Visto recientemente
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-4">
          {cardProps.map((props) => (
            <ProductCard key={props.id} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}

/**
 * Hook para registrar un producto como "visto recientemente"
 * Usar en PDP con useEffect
 */
export function useTrackRecentlyViewed(item: RecentlyViewedItem | null) {
  useEffect(() => {
    if (!item) return;

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      let items: RecentlyViewedItem[] = [];

      if (stored) {
        try {
          items = JSON.parse(stored) as RecentlyViewedItem[];
          if (!Array.isArray(items)) items = [];
        } catch {
          items = [];
        }
      }

      // Dedupe por id
      items = items.filter((i) => i.id !== item.id);
      // Agregar al inicio (newest first)
      items.unshift(item);
      // Cortar a MAX_ITEMS
      items = items.slice(0, MAX_ITEMS);

      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (err) {
      console.error("[useTrackRecentlyViewed] Error writing to localStorage:", err);
      // Degradar sin errores
    }
  }, [item]);
}

