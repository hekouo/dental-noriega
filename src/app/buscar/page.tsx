// src/app/buscar/page.tsx
import dynamicImport from "next/dynamic";
import { searchProductsServer } from "@/lib/search/search.server";
import SearchResultCard from "@/components/SearchResultCard";
import SearchTracker from "@/components/SearchTracker.client";
import { ROUTES } from "@/lib/routes";
import Link from "next/link";
import { Search } from "lucide-react";

const SearchInput = dynamicImport(
  () => import("@/components/SearchInput.client"),
  {
    ssr: false,
  },
);

export const revalidate = 300; // Cache 5 minutos

type Props = {
  searchParams: { q?: string; page?: string };
};

export default async function BuscarPage({ searchParams }: Props) {
  const q = searchParams.q ?? "";
  const page = parseInt(searchParams.page ?? "1", 10);
  const limit = 20;
  const offset = (page - 1) * limit;

  const results = q ? await searchProductsServer(q, limit, offset) : [];

  return (
    <section className="space-y-6">
      {/* Analítica: search */}
      {q && <SearchTracker query={q} resultsCount={results.length} />}

      <div>
        <h1 className="text-3xl font-bold mb-4">Buscar Productos</h1>
        <SearchInput />
      </div>

      {q && (
        <p className="text-gray-600">
          {results.length} resultado{results.length === 1 ? "" : "s"} para{" "}
          <strong>"{q}"</strong>
          {page > 1 && ` (página ${page})`}
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
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {results.map((item) => (
              <SearchResultCard
                key={item.id}
                item={{
                  id: item.id,
                  section: item.section,
                  product_slug: item.product_slug,
                  title: item.title,
                  price_cents: item.price_cents,
                  image_url: item.image_url ?? null,
                  in_stock: item.in_stock ?? null,
                  stock_qty: null,
                }}
              />
            ))}
          </div>

          {/* Paginación simple */}
          {results.length === limit && (
            <div className="flex justify-center gap-2 pt-4">
              {page > 1 && (
                <Link
                  href={`/buscar?q=${encodeURIComponent(q)}&page=${page - 1}`}
                  className="btn btn-outline"
                >
                  ← Anterior
                </Link>
              )}
              <Link
                href={`/buscar?q=${encodeURIComponent(q)}&page=${page + 1}`}
                className="btn btn-outline"
              >
                Siguiente →
              </Link>
            </div>
          )}
        </>
      )}
    </section>
  );
}
