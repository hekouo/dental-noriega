// src/app/destacados/page.tsx
"use client";

import { useState } from "react";
import * as Featured from "@/lib/featured";
import { AddToCartBtn } from "@/components/AddToCartBtn";

type Product = {
  title: string;
  price: number;
  imageResolved?: string;
  image?: string;
  slug: string;
};

export default function DestacadosPage() {
  // Tomamos productos desde lib/featured aunque cambie el nombre del export
  const products: Product[] = ((Featured as any).products ??
    (Featured as any).featured ??
    (Featured as any).default ??
    []) as Product[];

  const [qtyMap, setQtyMap] = useState<Record<string, number>>({});
  const getQty = (slug: string) => qtyMap[slug] ?? 1;
  const setQty = (slug: string, v: number) =>
    setQtyMap((m) => ({ ...m, [slug]: Math.max(1, Number(v || 1)) }));

  return (
    <main className="max-w-6xl mx-auto p-6">
      <h1 className="text-3xl font-bold">Productos Destacados</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
        {products.map((p) => (
          <article key={p.slug} className="rounded-lg border p-4">
            <img
              alt={p.title}
              src={p.imageResolved ?? p.image ?? "/placeholder.png"}
              className="w-full h-40 object-contain"
            />
            <h2 className="mt-3 font-semibold line-clamp-2">{p.title}</h2>

            <p className="mt-1 text-blue-600 font-bold">
              ${Number(p.price).toFixed(2)} MXN
            </p>

            <div className="mt-3 flex items-center gap-3">
              <input
                type="number"
                min={1}
                value={getQty(p.slug)}
                onChange={(e) => setQty(p.slug, e.target.valueAsNumber)}
                className="w-20 rounded border px-2 py-1"
              />

              <AddToCartBtn
                product={{
                  title: p.title,
                  price: Number(p.price),
                  imageResolved: p.imageResolved,
                  image: p.image,
                  slug: p.slug,
                }}
                sectionSlug="destacados" // cambia si tu sección real se llama distinto
                qty={getQty(p.slug)}
              />
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}
