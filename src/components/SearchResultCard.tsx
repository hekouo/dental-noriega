// src/components/SearchResultCard.tsx
"use client";
import React from "react";
import Link from "next/link";
import ImageWithFallback from "@/components/ui/ImageWithFallback";
import CatalogCardControls from "@/components/CatalogCardControls";
import { formatMXN as formatMXNMoney } from "@/lib/utils/money";
import { escapeRegExp } from "@/lib/search/normalize";
import type { CatalogItem } from "@/lib/supabase/catalog";
import { track } from "@/lib/analytics";

type Props = {
  item: CatalogItem;
  highlightQuery?: string;
};

/**
 * Resalta el término de búsqueda en el texto (highlight seguro)
 */
function highlightText(text: string, query?: string): JSX.Element {
  if (!query || !text) return <>{text}</>;

  const escaped = escapeRegExp(query);
  const regex = new RegExp(`(${escaped})`, "gi");
  const parts = text.split(regex);

  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? <mark key={i}>{part}</mark> : part,
      )}
    </>
  );
}

export default function SearchResultCard({ item, highlightQuery }: Props) {
  const handleClick = () => {
    track("select_item", {
      id: item.id,
      title: item.title,
      section: item.section,
    });
  };

  // Precio normalizado: puede venir como price_cents (número) o price (número o string)
  const priceValue =
    typeof item.price_cents === "number"
      ? item.price_cents / 100
      : typeof (item as any).price === "number"
        ? (item as any).price
        : item.price_cents ?? 0;

  return (
    <div className="rounded-2xl border p-3 flex flex-col">
      <Link
        href={`/catalogo/${item.section}/${item.product_slug}`}
        onClick={handleClick}
      >
        <div className="relative w-full aspect-square bg-white">
          <ImageWithFallback
            src={item.image_url}
            width={400}
            height={400}
            alt={item.title}
            className="w-full h-full object-contain"
            square
          />
        </div>
      </Link>
      <h3 className="mt-2 text-sm font-semibold line-clamp-2">
        {highlightQuery ? highlightText(item.title, highlightQuery) : item.title}
      </h3>
      <div className="text-blue-600 font-bold">
        {formatMXNMoney(priceValue)}
      </div>
      {item.in_stock === false && (
        <span className="mt-1 inline-block rounded bg-red-100 px-2 py-0.5 text-[11px] text-red-700">
          Agotado
        </span>
      )}
      <CatalogCardControls item={item} />
    </div>
  );
}
