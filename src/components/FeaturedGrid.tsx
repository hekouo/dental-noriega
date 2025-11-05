import Link from "next/link";
import Image from "next/image";
import { formatMXN } from "@/lib/utils/money";
import { mxnFromCents } from "@/lib/utils/currency";
import type { FeaturedItem } from "@/lib/catalog/getFeatured.server";

export default function FeaturedGrid({ items }: { items: FeaturedItem[] }) {
  if (!items?.length) return null;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {items.map((p) => {
        const price = p.price_cents ? mxnFromCents(p.price_cents) : null;
        const href =
          p.section && p.product_slug
            ? `/catalogo/${p.section}/${p.product_slug}`
            : `/catalogo`;
        return (
          <Link
            key={p.product_id}
            href={href}
            prefetch={false}
            className="rounded-2xl border p-3 hover:shadow transition-shadow"
          >
            <div className="relative h-40 w-full bg-gray-50 rounded-xl overflow-hidden">
              {p.image_url ? (
                <Image
                  src={p.image_url}
                  alt={p.title}
                  fill
                  sizes="256px"
                  className="object-contain"
                />
              ) : (
                <div className="h-full w-full grid place-content-center text-xs text-gray-400">
                  Sin imagen
                </div>
              )}
            </div>
            <div className="mt-2 text-sm font-semibold line-clamp-2">
              {p.title}
            </div>
            <div className="text-blue-600 font-bold">
              {price !== null ? formatMXN(price) : "—"}
            </div>
          </Link>
        );
      })}
    </div>
  );
}
