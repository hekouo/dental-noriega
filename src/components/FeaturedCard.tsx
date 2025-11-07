// src/components/FeaturedCard.tsx
"use client";
import type { ReactNode } from "react";
import Link from "next/link";
import ImageWithFallback from "@/components/ui/ImageWithFallback";
import { mxnFromCents, formatMXN } from "@/lib/utils/currency";
import { hasPurchasablePrice } from "@/lib/catalog/model";
import type { FeaturedItem } from "@/lib/catalog/getFeatured.server";

type Props = {
  item: FeaturedItem;
  priority?: boolean;
  sizes?: string;
  controls?: ReactNode;
};

export default function FeaturedCard({
  item,
  priority = false,
  sizes,
  controls,
}: Props) {
  const href =
    item.section && item.product_slug
      ? `/catalogo/${item.section}/${item.product_slug}`
      : `/catalogo`;
  const priceCents = item.price_cents ?? 0;
  const price = priceCents > 0 ? mxnFromCents(priceCents) : null;
  const canPurchase = hasPurchasablePrice(item);

  return (
    <div className="border rounded-xl overflow-hidden flex flex-col">
      <Link href={href} prefetch={false} className="block">
        <div className="relative w-full aspect-square bg-white">
          <ImageWithFallback
            src={item.image_url}
            alt={item.title}
            width={512}
            height={512}
            priority={priority}
            sizes={sizes ?? "(min-width: 1024px) 33vw, 100vw"}
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
        <div className="mt-2 space-y-2">
          <div className="text-lg font-semibold">
            {price !== null ? formatMXN(price) : "—"}
          </div>
          {controls}
          {!controls && !canPurchase ? (
            <p className="text-sm text-muted-foreground">Agotado</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
