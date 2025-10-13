// src/app/buscar/page.tsx
import Link from "next/link";
import ProductImage from "@/components/ProductImage";
import PointsBadge from "@/components/PointsBadge";
import { searchProducts } from "@/lib/search";
import { formatPrice } from "@/lib/utils/catalog";
import { pointsFor } from "@/lib/utils/points";
import { ROUTES } from "@/lib/routes";
import { Search } from "lucide-react";

export const revalidate = 300; // Cache 5 minutos

type Props = {
  searchParams: { q?: string };
};

export default async function BuscarPage({ searchParams }: Props) {
  const q = searchParams.q ?? "";
  const results = q ? await searchProducts(q) : [];

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-4">Buscar Productos</h1>
        <form action="/buscar" method="GET" className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              name="q"
              defaultValue={q}
              autoComplete="off"
              className="border rounded-lg px-10 py-3 w-full min-h-[44px]"
              placeholder="Buscar por nombre, descripción o categoría..."
              autoFocus
            />
          </div>
          <button className="btn btn-primary px-6 py-3 rounded-lg" type="submit">
            <span>Buscar</span>
          </button>
        </form>
      </div>

      {q && (
        <p className="text-gray-600">
          {results.length} resultado{results.length === 1 ? "" : "s"} para <strong>"{q}"</strong>
        </p>
      )}

      {!q && (
        <div className="text-center py-12 text-gray-500">
          <Search size={48} className="mx-auto mb-4 opacity-50" />
          <p>Ingresa un término para buscar productos</p>
        </div>
      )}

      {q && results.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <p className="mb-4">No se encontraron resultados para "{q}"</p>
          <Link href={ROUTES.catalogIndex()} className="btn btn-primary">
            <span>Ver todo el catálogo</span>
          </Link>
        </div>
      )}

      {results.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {results.map((it, idx) => (
            <Link
              key={`${it.sectionSlug}-${it.slug}`}
              href={ROUTES.product(it.sectionSlug, it.slug)}
              prefetch={false}
              className="border rounded-xl p-3 hover:shadow-lg transition-shadow"
            >
              <span className="block">
                <div className="relative w-full aspect-[4/3] bg-gray-50 rounded-lg overflow-hidden mb-2">
                  <ProductImage
                    src={it.image}
                    resolved={it.imageResolved}
                    alt={it.title}
                    sizes="(min-width:1024px) 25vw, (min-width:768px) 33vw, 50vw"
                    priority={idx === 0}
                  />
                </div>
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h3 className="font-medium text-sm line-clamp-2 flex-1">
                    {it.title}
                  </h3>
                  <PointsBadge points={pointsFor(it.price, 1)} />
                </div>
                <p className="text-primary-700 font-semibold mb-1">
                  {formatPrice(it.price)}
                </p>
                <p className="text-xs text-gray-500">{it.sectionName}</p>
              </span>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
