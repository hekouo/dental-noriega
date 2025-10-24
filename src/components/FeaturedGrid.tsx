"use client";

import { useState } from "react";
import Link from "next/link";
import { AddToCartBtn } from "@/components/AddToCartBtn";
import ProductImage from "@/components/ProductImage";
import { formatPrice } from "@/lib/utils/catalog";
import PointsBadge from "@/components/PointsBadge";
import { pointsFor } from "@/lib/utils/points";
import { ROUTES } from "@/lib/routes";

type Product = {
  title: string;
  price: number;
  image?: string;
  imageResolved?: string;
  slug: string;
};

type FeaturedItem = {
  sectionSlug: string;
  item: Product;
};

export default function FeaturedGrid({ items }: { items: FeaturedItem[] }) {
  const [qtyMap, setQtyMap] = useState<Record<string, number>>({});

  const keyFor = (s: string, slug: string) => `${s}:${slug}`;
  const getQty = (k: string) => qtyMap[k] ?? 1;
  const setQty = (k: string, v: number) =>
    setQtyMap((m) => ({ ...m, [k]: Math.max(1, Number.isFinite(v) ? v : 1) }));

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
      {items.map(({ sectionSlug, item }, idx) => {
        const k = keyFor(sectionSlug, item.slug);
        return (
          <article
            key={`${sectionSlug}-${item.slug}`}
            className="border rounded-xl p-3 hover:shadow-lg transition-shadow"
          >
            <Link
              href={ROUTES.product(sectionSlug, item.slug)}
              prefetch={idx < 4}
              className="block"
            >
              <div className="relative w-full aspect-[4/3] bg-gray-50 rounded-lg overflow-hidden mb-2">
                <ProductImage
                  src={item.image || "/img/products/placeholder.png"}
                  resolved={item.imageResolved}
                  alt={item.title}
                  sizes="(min-width:1024px) 25vw, (min-width:768px) 33vw, 50vw"
                  priority={idx === 0}
                />
              </div>

              <div className="flex items-start justify-between gap-2 mb-1">
                <h3 className="font-medium text-sm line-clamp-2 flex-1">
                  {item.title}
                </h3>
                <PointsBadge points={pointsFor(item.price, 1)} />
              </div>

              <p className="text-primary-700 font-semibold">
                {formatPrice(item.price)}
              </p>
            </Link>

            <div className="mt-3 flex items-center gap-2">
              <input
                type="number"
                min={1}
                value={getQty(k)}
                onChange={(e) => setQty(k, e.currentTarget.valueAsNumber)}
                className="w-20 rounded border px-2 py-1"
              />
              <AddToCartBtn
                product={{
                  title: item.title,
                  price: Number(item.price),
                  image: item.image,
                  imageResolved: item.imageResolved,
                  slug: item.slug,
                }}
                sectionSlug={sectionSlug}
                qty={getQty(k)}
              />
            </div>
          </article>
        );
      })}
    </div>
  );
}
