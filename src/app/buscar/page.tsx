// src/app/buscar/page.tsx
import React from "react";
import Link from "next/link";
import type { Metadata } from "next";
import dynamicImport from "next/dynamic";
import { AlertCircle } from "lucide-react";
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
import { getFeaturedItems } from "@/lib/catalog/getFeatured.server";
import FeaturedGrid from "@/components/FeaturedGrid";
import SectionHeader from "@/components/ui/SectionHeader";
import { SITE_URL } from "@/lib/site";
import QuickSearchBar from "@/components/search/QuickSearchBar";
import StorefrontListHeader from "@/components/storefront/StorefrontListHeader";
import EmptyState from "@/components/storefront/EmptyState";

const BuscarClient = dynamicImport(() => import("./BuscarClient"), {
  ssr: false,
});

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
  alternates: {
    canonical: "/buscar",
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

const SearchFiltersMobile = dynamicImport(
  () => import("@/components/search/SearchFiltersMobile.client"),
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

  // Obtener productos destacados para recomendaciones
  const featuredItems = await getFeaturedItems();

  // Búsquedas populares y categorías para chips
  const popularSearches = [
    "guantes de nitrilo",
    "brackets metálicos",
    "arcos NITI",
    "resina dental",
    "puntas profilaxis",
    "brackets cerámicos",
  ];

  const popularCategories = [
    { name: "Consumibles", slug: "consumibles-y-profilaxis" },
    { name: "Equipos", slug: "equipos" },
    { name: "Instrumental", slug: "instrumental-clinico" },
    { name: "Ortodoncia", slug: "ortodoncia-brackets-y-tubos" },
  ];

  if (!q) {
    return (
      <section className="max-w-5xl mx-auto px-4 py-6 sm:py-10 space-y-8" role="search">
        {/* Header editorial */}
        <div className="text-center sm:text-left">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 dark:text-white scroll-mt-20 mb-2">
            Buscar productos
          </h1>
          <p className="text-sm sm:text-base text-stone-600 dark:text-gray-400">
            Encuentra insumos y equipos dentales por nombre, categoría o descripción.
          </p>
        </div>

        {/* Input en bloque premium */}
        <div className="rounded-xl border border-stone-200/90 dark:border-gray-700 bg-stone-50/50 dark:bg-gray-800/30 p-4 sm:p-6 shadow-sm">
          <QuickSearchBar />
        </div>

        {/* Búsquedas populares */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-foreground mb-4">
            Búsquedas populares
          </h2>
          <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar scroll-smooth">
            {popularSearches.map((search) => (
              <Link
                key={search}
                href={`/buscar?q=${encodeURIComponent(search)}`}
                className="flex-shrink-0 px-4 py-2.5 bg-white dark:bg-card border border-stone-200 dark:border-border rounded-full text-sm text-gray-700 dark:text-foreground hover:bg-primary-50 dark:hover:bg-primary-900/30 hover:border-primary-500 dark:hover:border-primary-500 hover:text-primary-700 dark:hover:text-primary-400 transition-all duration-200 focus-premium tap-feedback min-h-[44px] inline-flex items-center justify-center"
              >
                {search}
              </Link>
            ))}
          </div>
        </div>

        {/* Categorías */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-foreground mb-4">
            Explorar por categoría
          </h2>
          <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar scroll-smooth">
            {popularCategories.map((category) => (
              <Link
                key={category.slug}
                href={ROUTES.section(category.slug)}
                className="flex-shrink-0 px-4 py-2.5 bg-primary-50 dark:bg-primary-900/30 border border-primary-200 dark:border-primary-700 rounded-full text-sm text-primary-700 dark:text-primary-400 hover:bg-primary-100 dark:hover:bg-primary-900/50 hover:border-primary-400 dark:hover:border-primary-600 transition-all duration-200 font-medium focus-premium tap-feedback min-h-[44px] inline-flex items-center justify-center"
              >
                {category.name}
              </Link>
            ))}
          </div>
        </div>
      </section>
    );
  }

  const base = SITE_URL;
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

  // Filtrar destacados para evitar duplicados con resultados
  const resultIds = new Set(items.map((item) => item.id));
  const filteredFeatured = featuredItems.filter(
    (item) => !resultIds.has(item.product_id),
  );

  // Determinar si hay pocos resultados (≤3)
  const hasFewResults = total > 0 && total <= 3;

  return (
    <section className="max-w-5xl mx-auto px-4 py-6 sm:py-10 space-y-8" role="search">
      {/* Analytics tracking */}
      {total > 0 && <SearchTracker query={q} resultsCount={total} />}

      {/* Quick Search Bar */}
      <QuickSearchBar initialQuery={q} />

      {/* Búsquedas recientes */}
      <BuscarClient query={q} hasResults={items.length > 0} total={total} />

      {/* Header editorial + Input en bloque premium */}
      <div className="rounded-xl border border-stone-200/90 dark:border-gray-700 bg-stone-50/50 dark:bg-gray-800/30 p-4 sm:p-6 shadow-sm space-y-4">
        <StorefrontListHeader
          title={q ? `Resultados para "${q}"` : "Buscar productos"}
          counter={
            total > 0
              ? `${total} producto${total !== 1 ? "s" : ""}`
              : undefined
          }
          level={1}
          className="mb-0"
        />
        <SearchInput sticky />
      </div>

      {items.length > 0 && (
        <>
          {/* Filtros móviles: botón sticky + bottom sheet */}
          <SearchFiltersMobile
            inStockOnly={inStockOnly}
            priceRange={priceRange}
            sort={sort}
            basePath={ROUTES.buscar()}
            preserveParams={{
              q,
            }}
          />

          {/* Filtros desktop: ocultos en móvil */}
          <div className="mb-6 space-y-4 hidden md:block">
            {page > 1 && (
              <p className="text-gray-500 text-sm">Página {page}</p>
            )}
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
        <>
          <div className="mt-2">
          <EmptyState
            title="No encontramos eso"
            description="Prueba otra búsqueda o escríbenos y lo conseguimos."
            icon={<AlertCircle className="w-10 h-10 text-current" aria-hidden="true" />}
            role="status"
            aria-live="polite"
          >
            <div className="bg-muted/50 rounded-lg p-4 text-left max-w-lg mx-auto">
              <p className="text-xs font-semibold text-foreground mb-2">💡 Sugerencias para mejorar tu búsqueda:</p>
              <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                <li>Prueba con una palabra más general (ej: &quot;guantes&quot; en lugar de &quot;guantes de nitrilo azul&quot;)</li>
                <li>Revisa la ortografía o usa sinónimos</li>
                <li>Busca por categoría o marca</li>
              </ul>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-3 font-medium">Búsquedas populares:</p>
              <div className="flex flex-wrap gap-2 justify-center">
                {["guantes", "brackets", "arcos", "resina", "anestesia", "algodon", "mascarillas", "ácido grabador", "limas"].map((suggestion) => (
                  <Link
                    key={suggestion}
                    href={`/buscar?q=${encodeURIComponent(suggestion)}`}
                    className="px-4 py-2 bg-muted hover:bg-primary-100 dark:hover:bg-primary-900/30 border border-border rounded-full text-sm text-foreground hover:text-primary-600 dark:hover:text-primary-400 transition-colors duration-200 focus-premium tap-feedback min-h-[44px] inline-flex items-center justify-center"
                  >
                    {suggestion}
                  </Link>
                ))}
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              {(inStockOnly || priceRange !== "all" || sort !== "relevance") && (
                <Link
                  href={`/buscar?q=${encodeURIComponent(q)}`}
                  className="px-6 py-3 bg-muted border border-border text-foreground rounded-lg hover:bg-muted/80 transition-colors duration-200 font-medium focus-premium tap-feedback min-h-[44px] inline-flex items-center justify-center"
                >
                  Quitar filtros
                </Link>
              )}
              <Link
                href={ROUTES.destacados()}
                className="px-6 py-3 bg-primary-600 dark:bg-primary-700 text-white rounded-lg hover:bg-primary-700 dark:hover:bg-primary-600 transition-colors duration-200 font-medium focus-premium tap-feedback min-h-[44px] inline-flex items-center justify-center"
              >
                Ver destacados
              </Link>
              {getWhatsAppUrl(`Hola, busco productos relacionados con "${q}" en Depósito Dental Noriega.`) && (
                <Link
                  href={getWhatsAppUrl(`Hola, busco productos relacionados con "${q}" en Depósito Dental Noriega.`)!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-6 py-3 border-2 border-green-500 dark:border-green-600 text-green-700 dark:text-green-400 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors duration-200 font-medium focus-premium tap-feedback min-h-[44px] inline-flex items-center justify-center"
                >
                  Preguntar por WhatsApp
                </Link>
              )}
            </div>
          </EmptyState>
          </div>

          {/* Productos destacados cuando no hay resultados */}
          <div className="mt-12 pt-8 border-t border-stone-200/80 dark:border-gray-700">
            <SectionHeader
              title="Te recomendamos estos productos destacados"
              subtitle="Productos que podrían interesarte"
            />
            {filteredFeatured.length > 0 ? (
              <FeaturedGrid
                items={filteredFeatured.slice(0, 8)}
                source="search_no_results"
                query={q}
              />
            ) : (
              <FeaturedGrid
                items={featuredItems.slice(0, 8)}
                source="search_no_results"
                query={q}
              />
            )}
          </div>
        </>
      )}

      {items.length > 0 && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 sm:gap-6 min-w-0 mt-2">
            {items.map((it, index) => (
              <div
                key={it.id}
                className="min-w-0"
                style={{ "--delay": `${index * 50}ms` } as React.CSSProperties}
              >
                <SearchResultCard
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
                  position={index + 1}
                />
              </div>
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

          {/* Sección "También te puede interesar" cuando hay pocos resultados */}
          {hasFewResults && filteredFeatured.length > 0 && (
            <div className="mt-12 pt-8 border-t border-stone-200/80 dark:border-gray-700">
              <SectionHeader
                title="También te puede interesar"
                subtitle="Otros productos similares que suelen revisar nuestros clientes"
              />
              <FeaturedGrid
                items={filteredFeatured.slice(0, 8)}
                source="search_low_results"
                query={q}
              />
            </div>
          )}
        </>
      )}
    </section>
  );
}
