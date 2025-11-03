"use client";

import { Suspense, useEffect, useState, useMemo } from "react";
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
  price_cents: number;
  image_url?: string | null;
  in_stock?: boolean | null;
};

function BuscarContent() {
  const searchParams = useSearchParams();
  const q = searchParams?.get("q") ?? "";
  const page = parseInt(searchParams?.get("page") ?? "1", 10);
  const limit = 20;

  const [allProducts, setAllProducts] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Cargar productos del servidor
  useEffect(() => {
    async function loadProducts() {
      try {
        const response = await fetch("/api/products/all");
        if (response.ok) {
          const data = await response.json();
          setAllProducts(data);
        } else {
          // Fallback: usar searchProductsServer si la API no existe
          const response2 = await fetch(
            `/api/search?q=&limit=1000&offset=0`,
          );
          if (response2.ok) {
            const data2 = await response2.json();
            setAllProducts(data2);
          }
        }
      } catch (error) {
        console.warn("[Buscar] Error cargando productos:", error);
      } finally {
        setIsLoading(false);
      }
    }

    loadProducts();
  }, []);

  // Filtrar productos en cliente
  const filteredProducts = useMemo(() => {
    if (!q || !allProducts.length) return [];

    const queryLower = q.toLowerCase().trim();
    return allProducts.filter((item) => {
      const titleMatch = item.title.toLowerCase().includes(queryLower);
      const sectionMatch = item.section.toLowerCase().includes(queryLower);
      return titleMatch || sectionMatch;
    });
  }, [q, allProducts]);

  // Paginar resultados
  const paginatedResults = useMemo(() => {
    const start = (page - 1) * limit;
    const end = start + limit;
    return filteredProducts.slice(start, end);
  }, [filteredProducts, page, limit]);

  const totalPages = Math.ceil(filteredProducts.length / limit);

  if (isLoading) {
    return (
      <section className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-4">Buscar Productos</h1>
          <SearchInput />
        </div>
        <div className="text-center py-12 text-gray-500">Cargando...</div>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      {/* Analítica: search */}
      {q && <SearchTracker query={q} resultsCount={filteredProducts.length} />}

      <div>
        <h1 className="text-3xl font-bold mb-4">Buscar Productos</h1>
        <SearchInput />
      </div>

      {q && (
        <p className="text-gray-600">
          {filteredProducts.length} resultado{filteredProducts.length !== 1 ? "s" : ""} para{" "}
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

      {q && filteredProducts.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <p className="mb-4">No se encontraron resultados para "{q}"</p>
          <Link href={ROUTES.catalogIndex()} className="btn btn-primary">
            <span>Ver todo el catálogo</span>
          </Link>
        </div>
      )}

      {paginatedResults.length > 0 && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {paginatedResults.map((item) => (
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
