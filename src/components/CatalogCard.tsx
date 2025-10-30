import Link from "next/link";
import ImageWithFallback from "@/components/ui/ImageWithFallback";
import { formatMXN, mxnFromCents } from "@/lib/utils/currency";
import type { CatalogItem } from "@/lib/supabase/catalog";

export function CatalogCard({ item }: { item: CatalogItem }) {
  return (
    <div className="rounded-2xl border p-3">
      <Link href={`/catalogo/${item.section}/${item.product_slug}`}>
        <ImageWithFallback
          src={item.image_url}
          width={400}
          height={400}
          alt={item.title ?? "Producto"}
          square
        />
      </Link>
      <h3 className="mt-2 text-sm font-semibold line-clamp-2">{item.title}</h3>
      <div className="text-blue-600 font-bold">
        {formatMXN(mxnFromCents(item.price_cents))}
      </div>
      {item.in_stock === false && (
        <span className="mt-1 inline-block rounded bg-red-100 px-2 py-0.5 text-[11px] text-red-700">
          Agotado
        </span>
      )}
      {/* Controles van en componente client */}
    </div>
  );
}
