// src/app/checkout/gracias/Recommended.client.tsx
"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { getWithTTL, KEYS } from "@/lib/utils/persist";
import FeaturedGrid from "@/components/FeaturedGrid";
import type { FeaturedItem } from "@/lib/catalog/getFeatured.server";
import { buttonOutline, buttonPrimary } from "@/lib/styles/button";

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
  stock_qty?: number;
  image_url?: string | null;
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
    price_cents: p.price_cents || 0,
    currency: p.currency || "mxn",
    stock_qty: p.stock_qty || 0,
    image_url: p.image_url || null,
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
      <section className="mt-12">
        <h2 className="text-xl font-semibold mb-4">
          También te puede interesar
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="rounded-2xl border p-3 animate-pulse bg-gray-100 h-64"
            />
          ))}
        </div>
      </section>
    );
  }

  if (error || products.length === 0) {
    return (
      <section className="mt-12">
        <h2 className="text-xl font-semibold mb-4">
          También te puede interesar
        </h2>
        <div className="text-center py-8 text-gray-500">
          <p className="mb-4">{error || "Sin recomendados disponibles"}</p>
          <div className="flex gap-3 justify-center">
            <Link href="/destacados" className={buttonPrimary}>
              Ver destacados
            </Link>
            <Link href="/buscar" className={buttonOutline}>
              Buscar productos
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="mt-12">
      <h2 className="text-xl font-semibold mb-4">También te puede interesar</h2>
      <FeaturedGrid items={products} />
    </section>
  );
}
