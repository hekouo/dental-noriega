"use client";

import { useState } from "react";
import Link from "next/link";
import ProductImage from "@/components/ProductImage";
import PointsBadge from "@/components/PointsBadge";
import { pointsFor } from "@/lib/utils/points";
import { formatPrice } from "@/lib/utils/catalog";
import AddToCartBtn from "@/components/AddToCartBtn";
import { ROUTES } from "@/lib/routes";

export type FeaturedCard = {
  id?: string;
  title: string;
  price: number;
  image?: string;
  imageResolved?: string;
  slug: string;
  sectionSlug: string;
  code?: string;
};

type Props = { products: FeaturedCard[]; title?: string };

export default function FeaturedGrid({
  products,
  title = "Productos Destacados",
}: Props) {
  const [qty, setQty] = useState<Record<string, number>>({});
  const getQty = (slug: string) => qty[slug] ?? 1;
  const setQtyFor = (slug: string, v: number) =>
    setQty((m) => ({ ...m, [slug]: Math.max(1, v || 1) }));

  if (!products?.length) return null;

  return (
    <section className="py-12">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold">{title}</h2>
          <p className="text-gray-600">
            Añade directo al carrito sin entrar al detalle
          </p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {products.map((p, idx) => (
            <article
              key={p.id || `${p.sectionSlug}/${p.slug}`}
              className="border rounded-xl p-3 hover:shadow-lg transition-shadow"
            >
              <Link
                href={ROUTES.product(p.sectionSlug, p.slug)}
                prefetch={idx < 4}
                className="block"
              >
                <div className="relative w-full aspect-[4/3] bg-gray-50 rounded-lg overflow-hidden mb-2">
                  <ProductImage
                    src={p.image ?? ""}
                    resolved={p.imageResolved}
                    alt={p.title}
                    sizes="(min-width:1024px) 25vw, (min-width:768px) 33vw, 50vw"
                    priority={idx === 0}
                  />
                </div>
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h3 className="font-medium text-sm line-clamp-2 flex-1">
                    {p.title}
                  </h3>
                  <PointsBadge points={pointsFor(p.price, 1)} />
                </div>
                <p className="text-primary-700 font-semibold">
                  {formatPrice(p.price)}
                </p>
              </Link>

              <div className="mt-3 flex items-center gap-3">
                <input
                  type="number"
                  min={1}
                  value={getQty(p.slug)}
                  onChange={(e) => setQtyFor(p.slug, Number(e.target.value))}
                  className="w-20 rounded border px-2 py-1"
                />
                <AddToCartBtn
                  productId={p.id || `${p.sectionSlug}/${p.slug}`}
                  productTitle={p.title}
                  productPrice={p.price}
                  qty={getQty(p.slug)}
                  className="flex-1 relative inline-flex items-center justify-center rounded-2xl px-4 py-3 text-sm font-semibold text-neutral-900 bg-gradient-to-b from-white to-neutral-200 shadow-[inset_0_2px_6px_rgba(255,255,255,0.9),0_6px_14px_rgba(0,0,0,0.20)] ring-1 ring-inset ring-neutral-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-neutral-400 active:translate-y-[2px] active:shadow-[inset_0_1px_3px_rgba(255,255,255,0.8),0_4px_10px_rgba(0,0,0,0.18)] transition-transform"
                />
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
