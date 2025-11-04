// src/components/SearchResultCard.tsx
"use client";
import Link from "next/link";
import ImageWithFallback from "@/components/ui/ImageWithFallback";
import CatalogCardControls from "@/components/CatalogCardControls";
import { formatMXN, mxnFromCents } from "@/lib/utils/currency";
import type { CatalogItem } from "@/lib/supabase/catalog";

type Props = {
  item: CatalogItem;
  highlightQuery?: string;
};

/**
 * Resalta el término de búsqueda en el texto
 */
function highlightText(text: string, query?: string): JSX.Element {
  if (!query || !text) return <>{text}</>;

  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
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
  return (
    <div className="rounded-2xl border p-3 flex flex-col">
      <Link href={`/catalogo/${item.section}/${item.product_slug}`}>
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
        {formatMXN(mxnFromCents(item.price_cents))}
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
