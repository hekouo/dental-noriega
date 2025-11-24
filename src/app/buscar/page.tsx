// src/app/buscar/page.tsx
import React from "react";
import Link from "next/link";
import type { Metadata } from "next";
import dynamicImport from "next/dynamic";
import { Search } from "lucide-react";
import SearchResultCard from "@/components/SearchResultCard";
import { ROUTES } from "@/lib/routes";
import { getWhatsAppUrl } from "@/lib/whatsapp/config";
import SearchTracker from "@/components/SearchTracker.client";
import Pagination from "@/components/catalog/Pagination";
import {
  CATALOG_PAGE_SIZE,
  parsePage,
  normalizeSortParam,
  normalizePriceRangeParam,
} from "@/lib/catalog/config";

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

const FiltersSelect = dynamicImport(
  () => import("@/components/catalog/FiltersSelect.client"),
  { ssr: false },
);

type Props = {
  searchParams: {
    q?: string;
    page?: string;
    sort?: string;
    inStock?: string;
    priceRange?: string;
  };
};

export default async function BuscarPage({ searchParams }: Props) {
  const qRaw = searchParams.q ?? "";
  const q = qRaw.trim();
  const page = parsePage(searchParams.page);
  const sort = normalizeSortParam(searchParams.sort);
  const inStockOnly = searchParams.inStock === "true";
  const priceRange = normalizePriceRangeParam(searchParams.priceRange);

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
  const queryParams = new URLSearchParams();
  queryParams.set("q", q);
  queryParams.set("page", page.toString());
  if (sort !== "relevance") {
    queryParams.set("sort", sort);
  }
  if (inStockOnly) {
    queryParams.set("inStock", "true");
  }
  if (priceRange !== "all") {
    queryParams.set("priceRange", priceRange);
  }
  const apiUrl = base
    ? `${base}/api/products/search?${queryParams.toString()}`
    : `/api/products/search?${queryParams.toString()}`;

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
          <div className="mb-6 space-y-4">
            <p className="text-gray-700">
              {total} resultado{total !== 1 ? "s" : ""} para{" "}
              <strong className="text-gray-900">"{q}"</strong>
              {page > 1 && (
                <span className="text-gray-500 text-sm"> (página {page})</span>
              )}
            </p>
            <div className="flex flex-col gap-4">
              <FiltersSelect
                inStockOnly={inStockOnly}
                priceRange={priceRange}
                basePath={ROUTES.buscar()}
                preserveParams={{
                  q,
                  ...(sort !== "relevance" ? { sort } : {}),
                }}
              />
              <div className="flex justify-end">
                <SortSelect
                  currentSort={sort}
                  basePath={ROUTES.buscar()}
                  preserveParams={{
                    q,
                    ...(inStockOnly ? { inStock: "true" } : {}),
                    ...(priceRange !== "all" ? { priceRange } : {}),
                  }}
                />
              </div>
            </div>
          </div>
        </>
      )}

      {items.length === 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center max-w-2xl mx-auto">
          <div className="w-16 h-16 mx-auto rounded-full bg-gray-100 flex items-center justify-center mb-4">
            <Search className="w-8 h-8 text-gray-400" aria-hidden="true" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            No encontramos resultados para "{q}"
          </h2>
          <p className="text-sm text-gray-600 mb-6">
            Prueba con otro término (por ejemplo, "brackets", "guantes", "resortes") o escríbenos por WhatsApp y te ayudamos a encontrar el producto.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href={ROUTES.catalogIndex()}
              className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
            >
              Ver todo el catálogo
            </Link>
            {getWhatsAppUrl(`Hola, busco productos relacionados con "${q}" en Depósito Dental Noriega.`) && (
              <Link
                href={getWhatsAppUrl(`Hola, busco productos relacionados con "${q}" en Depósito Dental Noriega.`)!}
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-3 border border-green-500 text-green-700 rounded-lg hover:bg-green-50 transition-colors font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2"
              >
                Hablar por WhatsApp
              </Link>
            )}
          </div>
        </div>
      )}

      {items.length > 0 && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {items.map((it) => (
              <SearchResultCard
                key={it.id}
                item={{
                  id: it.id,
                  section: it.section,
                  product_slug: it.product_slug,
                  title: it.title,
                  price_cents: Math.round(it.price * 100),
                  image_url: it.image_url,
                  in_stock: true, // Los resultados ya están filtrados por is_active e in_stock
                  is_active: true,
                }}
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
              ...(inStockOnly ? { inStock: "true" } : {}),
              ...(priceRange !== "all" ? { priceRange } : {}),
            }}
          />
        </>
      )}
    </section>
  );
}
