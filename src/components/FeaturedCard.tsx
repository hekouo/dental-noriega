// src/components/FeaturedCard.tsx
"use client";
import Link from "next/link";
import ImageWithFallback from "@/components/ui/ImageWithFallback";
import FeaturedCardControls from "@/components/FeaturedCardControls";
import { mxnFromCents, formatMXN } from "@/lib/utils/currency";
import type { FeaturedItem } from "@/lib/catalog/getFeatured.server";

type Props = {
  item: FeaturedItem;
};

export default function FeaturedCard({ item }: Props) {
  const href =
    item.section && item.product_slug
      ? `/catalogo/${item.section}/${item.product_slug}`
      : `/catalogo`;
  const priceCents = item.price_cents ?? 0;
  const price = priceCents > 0 ? mxnFromCents(priceCents) : null;
  const inStock = item.stock_qty !== null ? item.stock_qty > 0 : null;

  return (
    <div className="border rounded-xl overflow-hidden flex flex-col">
      <Link href={href} prefetch={false} className="block">
        <div className="relative w-full aspect-square bg-white">
          <ImageWithFallback
            src={item.image_url}
            alt={item.title}
            width={512}
            height={512}
            className="w-full h-full object-contain"
          />
        </div>
      </Link>

      <div className="p-3 flex-1 flex flex-col">
        <h3 className="mt-2 line-clamp-2">
          <Link
            href={href}
            prefetch={false}
            className="text-sm font-medium hover:text-primary-600"
          >
            {item.title}
          </Link>
        </h3>
        <p className="text-sm text-gray-600">
          {price !== null ? formatMXN(price) : "—"}
        </p>
        {inStock === false && (
          <div className="mt-1 text-[11px] inline-flex items-center px-2 py-0.5 rounded bg-red-100 text-red-700">
            Agotado
          </div>
        )}

        <FeaturedCardControls item={item} />
      </div>
    </div>
  );
}
