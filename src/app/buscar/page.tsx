// src/app/buscar/page.tsx
import React from "react";
import Link from "next/link";
import type { Metadata } from "next";
import dynamicImport from "next/dynamic";
import SearchResultCard from "@/components/SearchResultCard";
import { ROUTES } from "@/lib/routes";
import SearchTracker from "@/components/SearchTracker.client";
import Pagination from "@/components/catalog/Pagination";
import { CATALOG_PAGE_SIZE, parsePage, normalizeSortParam } from "@/lib/catalog/config";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export const metadata: Metadata = {
  title: "Buscar productos",
  description:
    "Busca insumos y equipos dentales en nuestro catálogo. Encuentra el producto que necesitas por nombre, categoría o descripción.",
  openGraph: {
    title: "Buscar productos | Depósito Dental Noriega",
    description:
      "Busca insumos y equipos dentales en nuestro catálogo. Encuentra el producto que necesitas por nombre, categoría o descripción.",
    type: "website",
  },
};

const SearchInput = dynamicImport(
  () => import("@/components/SearchInput.client"),
  {
    ssr: false,
  },
);

const SortSelect = dynamicImport(
  () => import("@/components/catalog/SortSelect.client"),
  { ssr: false },
);

type Props = {
  searchParams: { q?: string; page?: string; sort?: string };
};

export default async function BuscarPage({ searchParams }: Props) {
  const qRaw = searchParams.q ?? "";
  const q = qRaw.trim();
  const page = parsePage(searchParams.page);
  const sort = normalizeSortParam(searchParams.sort);

  if (!q) {
    return (
      <section className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2 text-gray-900">
            Buscar productos
          </h1>
          <p className="text-gray-600 mb-6 text-sm">
            Encuentra los productos que necesitas
          </p>
          <SearchInput />
        </div>
        <div className="text-center py-12">
          <p className="text-gray-500 mb-2">Escribe algo para buscar</p>
          <p className="text-sm text-gray-400">
            Puedes buscar por nombre, categoría o descripción
          </p>
        </div>
      </section>
    );
  }

  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const apiUrl = base
    ? `${base}/api/products/search?q=${encodeURIComponent(q)}&page=${page}&sort=${sort}`
    : `/api/products/search?q=${encodeURIComponent(q)}&page=${page}&sort=${sort}`;

  const res = await fetch(apiUrl, {
    cache: "no-store",
  });

  const data = res.ok
    ? await res.json()
    : { items: [], total: 0, page, perPage: CATALOG_PAGE_SIZE, hasNextPage: false };

  const { items, total, perPage, hasNextPage } = data as {
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
    hasNextPage?: boolean;
  };

  // Calcular hasNextPage si no viene en la respuesta
  const calculatedHasNextPage = hasNextPage ?? items.length === perPage;

  return (
    <section className="space-y-6" role="search">
      {/* Analytics tracking */}
      {total > 0 && <SearchTracker query={q} resultsCount={total} />}

      <div>
        <h1 className="text-3xl font-bold mb-2 text-gray-900">
          Resultados de búsqueda
        </h1>
        <p className="text-gray-600 mb-6 text-sm">
          Encuentra los productos que necesitas
        </p>
        <SearchInput />
      </div>

      {items.length > 0 && (
        <>
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <p className="text-gray-700">
              {total} resultado{total !== 1 ? "s" : ""} para{" "}
              <strong className="text-gray-900">"{q}"</strong>
              {page > 1 && (
                <span className="text-gray-500 text-sm"> (página {page})</span>
              )}
            </p>
            <SortSelect
              currentSort={sort}
              basePath={ROUTES.buscar()}
              preserveParams={{ q }}
            />
          </div>
        </>
      )}

      {items.length === 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
          <p className="text-gray-700 mb-2 font-medium">
            No encontramos productos para "{q}"
          </p>
          <p className="text-sm text-gray-600 mb-6">
            Intenta con otros términos, revisa la ortografía o prueba con menos palabras
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href={ROUTES.destacados()}
              className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
            >
              Ver productos destacados
            </Link>
            <Link
              href="/tienda"
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              Ver todos los productos
            </Link>
          </div>
        </div>
      )}

      {items.length > 0 && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {items.map((it) => (
              <SearchResultCard
                key={it.id}
                item={
                  {
                    id: it.id,
                    section: it.section,
                    product_slug: it.product_slug,
                    title: it.title,
                    price_cents: Math.round(it.price * 100),
                    image_url: it.image_url,
                    in_stock: true, // Los resultados ya están filtrados por is_active e in_stock
                    is_active: true,
                  } as any
                }
                highlightQuery={q}
              />
            ))}
          </div>

          {/* Paginación */}
          <Pagination
            page={page}
            hasNextPage={calculatedHasNextPage}
            basePath={ROUTES.buscar()}
            extraQuery={{
              q,
              ...(sort !== "relevance" ? { sort } : {}),
            }}
          />
        </>
      )}
    </section>
  );
}
