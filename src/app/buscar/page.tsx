"use client";

import React, { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import dynamicImport from "next/dynamic";
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

type SearchResult = {
  id: string;
  section: string;
  product_slug: string;
  title: string;
  price: number;
  image_url: string | null;
};

type SearchResponse = {
  items: SearchResult[];
  total: number;
  page: number;
  perPage: number;
};

function BuscarContent() {
  const searchParams = useSearchParams();
  const q = searchParams?.get("q") ?? "";
  const page = parseInt(searchParams?.get("page") ?? "1", 10);

  const [data, setData] = useState<SearchResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Cargar resultados del endpoint de búsqueda
  useEffect(() => {
    async function loadSearchResults() {
      setIsLoading(true);
      setError(null);

      // Si q vacío, no hacer búsqueda
      if (!q || q.trim().length === 0) {
        setData(null);
        setIsLoading(false);
        return;
      }

      try {
        const params = new URLSearchParams({
          q: q.trim(),
          page: page.toString(),
        });
        const response = await fetch(`/api/products/search?${params}`);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const result = await response.json();
        setData(result);
      } catch (err) {
        console.error("[Buscar] Error:", err);
        setError("Error al buscar productos");
        setData(null);
      } finally {
        setIsLoading(false);
      }
    }

    loadSearchResults();
  }, [q, page]);

  const totalPages = data ? Math.ceil(data.total / data.perPage) : 0;

  if (isLoading && q) {
    return (
      <section className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-4">Buscar Productos</h1>
          <SearchInput />
        </div>
        <div className="text-center py-12 text-gray-500">Buscando...</div>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      {/* Analítica: search */}
      {q && data && (
        <SearchTracker query={q} resultsCount={data.total} />
      )}

      <div>
        <h1 className="text-3xl font-bold mb-4">Buscar Productos</h1>
        <SearchInput />
      </div>

      {error && (
        <div className="text-center py-12 text-red-500">
          <p>{error}</p>
        </div>
      )}

      {!q && (
        <div className="text-center py-12 text-gray-500">
          <Search size={48} className="mx-auto mb-4 opacity-50" />
          <p>Escribe algo para buscar</p>
        </div>
      )}

      {q && data && (
        <>
          <p className="text-gray-600">
            {data.total} resultado{data.total !== 1 ? "s" : ""} para{" "}
            <strong>"{q}"</strong>
            {page > 1 && ` (página ${page})`}
          </p>

          {data.items.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <p className="mb-4">No encontramos resultados para "{q}"</p>
              <Link href={ROUTES.catalogIndex()} className="btn btn-primary">
                <span>Ver todo el catálogo</span>
              </Link>
            </div>
          )}

          {data.items.length > 0 && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {data.items.map((item) => (
                  <SearchResultCard
                    key={item.id}
                    item={{
                      id: item.id,
                      section: item.section,
                      product_slug: item.product_slug,
                      title: item.title,
                      price_cents: item.price * 100,
                      image_url: item.image_url,
                      in_stock: null,
                      stock_qty: null,
                    }}
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
        </>
      )}
    </section>
  );
}

export default function BuscarPage() {
  return (
    <Suspense
      fallback={
        <section className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold mb-4">Buscar Productos</h1>
          </div>
          <div className="text-center py-12 text-gray-500">Cargando...</div>
        </section>
      }
    >
      <BuscarContent />
    </Suspense>
  );
}
