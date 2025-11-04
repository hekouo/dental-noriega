// src/app/checkout/gracias/Recommended.client.tsx
"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import ImageWithFallback from "@/components/ui/ImageWithFallback";
import { formatMXN as formatMXNMoney } from "@/lib/utils/money";
import { mxnFromCents } from "@/lib/utils/currency";
import { ROUTES } from "@/lib/routes";
import { getWithTTL, KEYS } from "@/lib/utils/persist";

type Product = {
  id: string;
  section: string;
  product_slug: string;
  title: string;
  price_cents: number;
  image_url?: string | null;
};

type LastOrder = {
  orderRef?: string;
  items?: Array<{ section?: string; slug?: string }>;
};

export default function RecommendedClient() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchRecommendations() {
      try {
        // Leer DDN_LAST_ORDER_V1 del localStorage
        const lastOrder = getWithTTL<LastOrder>(KEYS.LAST_ORDER);
        const section =
          lastOrder?.items?.[0]?.section || "consumibles-y-profilaxis";
        const excludeSlug = lastOrder?.items?.[0]?.slug || "";

        // Llamar a la nueva API
        const apiUrl = `/api/products/by-section?section=${encodeURIComponent(
          section,
        )}&excludeSlug=${encodeURIComponent(excludeSlug)}&limit=4`;
        const res = await fetch(apiUrl);

        if (!res.ok) {
          throw new Error(`API returned ${res.status}`);
        }

        const data = await res.json();
        if (data.items && Array.isArray(data.items) && data.items.length > 0) {
          setProducts(data.items);
        } else {
          // Fallback: buscar "arco" como término genérico
          const fallbackRes = await fetch(`/api/products/search?q=arco&page=1`);
          if (fallbackRes.ok) {
            const fallbackData = await fallbackRes.json();
            if (
              fallbackData.items &&
              Array.isArray(fallbackData.items) &&
              fallbackData.items.length > 0
            ) {
              setProducts(fallbackData.items.slice(0, 4));
            } else {
              setError("Sin recomendados disponibles");
            }
          } else {
            setError("Sin recomendados disponibles");
          }
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
          Productos recomendados para ti
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
          Productos recomendados para ti
        </h2>
        <div className="text-center py-8 text-gray-500">
          <p className="mb-4">{error || "Sin recomendados disponibles"}</p>
          <Link href={ROUTES.catalogIndex()} className="btn btn-primary">
            Ver catálogo completo
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="mt-12">
      <h2 className="text-xl font-semibold mb-4">
        Productos recomendados para ti
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {products.map((product) => (
          <Link
            key={product.id}
            href={ROUTES.product(product.section, product.product_slug)}
            className="rounded-2xl border p-3 flex flex-col hover:shadow-md transition-shadow"
          >
            <div className="relative w-full aspect-square bg-white">
              <ImageWithFallback
                src={product.image_url}
                width={400}
                height={400}
                alt={product.title}
                className="w-full h-full object-contain"
                square
              />
            </div>
            <h3 className="mt-2 text-sm font-semibold line-clamp-2">
              {product.title}
            </h3>
            <div className="text-blue-600 font-bold">
              {formatMXNMoney(mxnFromCents(product.price_cents))}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
