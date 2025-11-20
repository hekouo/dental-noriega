// src/app/checkout/gracias/Recommended.client.tsx
"use client";

import React, { useEffect, useState } from "react";
import { getWithTTL, KEYS } from "@/lib/utils/persist";
import FeaturedGrid from "@/components/FeaturedGrid";
import type { FeaturedItem } from "@/lib/catalog/getFeatured.server";

type LastOrder = {
  orderRef?: string;
  items?: Array<{ section?: string; slug?: string }>;
};

type ProductAPIResponse = {
  id: string;
  slug?: string;
  product_slug?: string;
  section?: string;
  title: string;
  description?: string | null;
  price_cents?: number;
  currency?: string;
  image_url?: string | null;
  in_stock?: boolean | null;
  is_active?: boolean | null;
};

function mapToFeaturedItem(
  p: ProductAPIResponse,
  section: string,
): FeaturedItem {
  return {
    product_id: p.id,
    product_slug: p.slug || p.product_slug || "",
    section: p.section || section,
    title: p.title,
    description: p.description || null,
    // No usar || 0, mantener null si no hay precio para que ProductCard lo maneje correctamente
    price_cents: p.price_cents ?? null,
    currency: p.currency || "mxn",
    image_url: p.image_url || null,
    // Mantener los valores reales de la API, no forzar valores por defecto
    in_stock: p.in_stock ?? null,
    is_active: p.is_active ?? null,
    position: 0,
  };
}

async function fetchRecommendationsBySections(
  sections: string[],
  excludeSlugs: string[],
): Promise<FeaturedItem[]> {
  const foundProducts: FeaturedItem[] = [];

  for (const section of sections.slice(0, 2)) {
    if (!section) continue;
    const apiUrl = `/api/products/by-section?section=${encodeURIComponent(section)}&limit=4`;
    const res = await fetch(apiUrl);

    if (!res.ok) continue;

    const data = await res.json();
    if (!data.items || !Array.isArray(data.items)) continue;

    const sectionProducts: FeaturedItem[] = data.items
      .filter(
        (p: ProductAPIResponse) =>
          !excludeSlugs.includes(p.slug || p.product_slug || ""),
      )
      .slice(0, 4)
      .map((p: ProductAPIResponse) => mapToFeaturedItem(p, section));

    foundProducts.push(...sectionProducts);
    if (foundProducts.length >= 4) break;
  }

  return foundProducts.slice(0, 4);
}

async function fetchFallbackRecommendations(): Promise<FeaturedItem[]> {
  const res = await fetch("/api/products/search?q=arco&page=1&limit=4");
  if (!res.ok) return [];

  const data = await res.json();
  if (!data.items || !Array.isArray(data.items)) return [];

  return data.items
    .slice(0, 4)
    .map((p: ProductAPIResponse) =>
      mapToFeaturedItem(p, "consumibles-y-profilaxis"),
    );
}

export default function RecommendedClient() {
  const [products, setProducts] = useState<FeaturedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchRecommendations() {
      try {
        const lastOrder = getWithTTL<LastOrder>(KEYS.LAST_ORDER);

        if (!lastOrder?.items || lastOrder.items.length === 0) {
          const fallback = await fetchFallbackRecommendations();
          if (fallback.length > 0) {
            setProducts(fallback);
          } else {
            setError("Sin recomendados disponibles");
          }
          setLoading(false);
          return;
        }

        const sections = [
          ...new Set(lastOrder.items.map((i) => i.section).filter(Boolean)),
        ] as string[];
        const excludeSlugs = lastOrder.items
          .map((i) => i.slug)
          .filter(Boolean) as string[];

        const foundProducts = await fetchRecommendationsBySections(
          sections,
          excludeSlugs,
        );

        if (foundProducts.length > 0) {
          setProducts(foundProducts);
        } else {
          setError("Sin recomendados disponibles");
        }
      } catch (e) {
        console.warn("[RecommendedClient] Error:", e);
        setError("Sin recomendados disponibles");
      } finally {
        setLoading(false);
      }
    }

    fetchRecommendations();
  }, []);

  if (loading) {
    return (
      <section className="mt-12 space-y-4">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">
            También te puede interesar
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Te dejamos algunos productos que combinan bien con tu compra.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="rounded-2xl border border-gray-200 p-4 animate-pulse bg-gray-100 h-52"
            />
          ))}
        </div>
        <p className="text-sm text-gray-500 text-center">
          Cargando recomendaciones…
        </p>
      </section>
    );
  }

  if (error || products.length === 0) {
    return null;
  }

  return (
    <section className="mt-12 space-y-4">
      <div>
        <h2 className="text-2xl font-semibold text-gray-900">
          También te puede interesar
        </h2>
        <p className="text-sm text-gray-600 mt-1">
          Te dejamos algunos productos que combinan bien con tu compra.
        </p>
      </div>
      <FeaturedGrid items={products} hideSoldOutLabel={true} />
    </section>
  );
}
