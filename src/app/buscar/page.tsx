// src/app/buscar/page.tsx
import React from "react";
import Link from "next/link";
import dynamicImport from "next/dynamic";
import SearchResultCard from "@/components/SearchResultCard";
import { ROUTES } from "@/lib/routes";
import SearchTracker from "@/components/SearchTracker.client";

export const dynamic = "force-dynamic";

const SearchInput = dynamicImport(
  () => import("@/components/SearchInput.client"),
  {
    ssr: false,
  },
);

type Props = {
  searchParams: { q?: string; page?: string };
};

export default async function BuscarPage({ searchParams }: Props) {
  const qRaw = searchParams.q ?? "";
  const q = qRaw.trim();
  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10));

  if (!q) {
    return (
      <section className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-4">Buscar Productos</h1>
          <SearchInput />
        </div>
        <div className="text-center py-12 text-gray-500">
          <p>Escribe algo para buscar.</p>
        </div>
      </section>
    );
  }

  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const apiUrl = base
    ? `${base}/api/products/search?q=${encodeURIComponent(q)}&page=${page}`
    : `/api/products/search?q=${encodeURIComponent(q)}&page=${page}`;

  const res = await fetch(apiUrl, {
    cache: "no-store",
  });

  const data = res.ok
    ? await res.json()
    : { items: [], total: 0, page, perPage: 20 };

  const { items, total, perPage } = data as {
    items: Array<{
      id: string;
      section: string;
      product_slug: string;
      title: string;
      price: number;
      image_url: string | null;
    }>;
    total: number;
    page: number;
    perPage: number;
  };

  const totalPages = Math.ceil(total / perPage);

  return (
    <section className="space-y-6" role="search">
      {/* Analytics tracking */}
      {total > 0 && <SearchTracker query={q} resultsCount={total} />}

      <div>
        <h1 className="text-3xl font-bold mb-4">Buscar Productos</h1>
        <SearchInput />
      </div>

      {items.length > 0 && (
        <p className="text-gray-600">
          {total} resultado{total !== 1 ? "s" : ""} para <strong>"{q}"</strong>
          {page > 1 && ` (página ${page})`}
        </p>
      )}

      {items.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <p className="mb-4">No encontramos resultados para "{q}".</p>
          <Link href={ROUTES.tienda()} className="btn btn-primary">
            <span>Ver tienda</span>
          </Link>
        </div>
      )}

      {items.length > 0 && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {items.map((it) => (
              <SearchResultCard
                key={it.id}
                item={{
                  id: it.id,
                  section: it.section,
                  product_slug: it.product_slug,
                  title: it.title,
                  price_cents: it.price * 100,
                  image_url: it.image_url,
                  in_stock: null,
                  stock_qty: null,
                } as any}
                highlightQuery={q}
              />
            ))}
          </div>

          {/* Paginación */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 pt-4">
              {page > 1 && (
                <Link
                  href={`/buscar?q=${encodeURIComponent(q)}&page=${page - 1}`}
                  className="btn btn-outline"
                >
                  ← Anterior
                </Link>
              )}
              <span className="px-4 py-2 text-gray-600">
                Página {page} de {totalPages}
              </span>
              {page < totalPages && (
                <Link
                  href={`/buscar?q=${encodeURIComponent(q)}&page=${page + 1}`}
                  className="btn btn-outline"
                >
                  Siguiente →
                </Link>
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
}
