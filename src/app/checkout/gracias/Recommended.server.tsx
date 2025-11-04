// src/app/checkout/gracias/Recommended.server.tsx
import React from "react";
import { getProductsBySectionFromView } from "@/lib/catalog/getProductsBySectionFromView.server";
import Link from "next/link";
import { formatMXN as formatMXNMoney } from "@/lib/utils/money";
import ImageWithFallback from "@/components/ui/ImageWithFallback";

type Props = {
  section?: string;
  excludeSlug?: string;
};

export default async function Recommended({ section, excludeSlug }: Props) {
  const targetSection = section || "consumibles-y-profilaxis";
  const products = await getProductsBySectionFromView(targetSection, 4, 0);

  // Filtrar el producto comprado si existe
  const filtered = excludeSlug
    ? products.filter((p) => p.product_slug !== excludeSlug)
    : products;

  // Tomar 4 productos
  const recommended = filtered.slice(0, 4);

  if (recommended.length === 0) return null;

  return (
    <section className="mt-10">
      <h2 className="text-xl font-semibold mb-4">Productos recomendados para ti</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {recommended.map((product) => (
          <Link
            key={product.id}
            href={`/catalogo/${product.section}/${product.product_slug}`}
            className="rounded-lg border p-3 flex flex-col hover:shadow-md transition-shadow"
          >
            <div className="relative w-full aspect-square bg-white mb-2">
              <ImageWithFallback
                src={product.image_url}
                width={200}
                height={200}
                alt={product.title}
                className="w-full h-full object-contain"
                square
              />
            </div>
            <h3 className="text-sm font-medium line-clamp-2 mb-1">
              {product.title}
            </h3>
            <p className="text-primary-600 font-semibold text-sm">
              {formatMXNMoney(
                typeof product.price_cents === "number"
                  ? product.price_cents / 100
                  : 0,
              )}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}

