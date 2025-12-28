"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { X, Filter } from "lucide-react";
import type { CatalogSortOption, PriceRangeKey } from "@/lib/catalog/config";
import { getPriceRangeLabel } from "@/lib/catalog/config";

type Props = {
  open: boolean;
  onClose: () => void;
  inStockOnly: boolean;
  priceRange: PriceRangeKey;
  sort: CatalogSortOption;
  basePath: string;
  preserveParams?: Record<string, string>;
};

/**
 * Bottom sheet para filtros en móvil
 * Maneja filtros y ordenamiento con navegación por URL
 */
export default function SearchFiltersSheet({
  open,
  onClose,
  inStockOnly: initialInStock,
  priceRange: initialPriceRange,
  sort: initialSort,
  basePath,
  preserveParams = {},
}: Props) {
  const router = useRouter();
  const [inStockOnly, setInStockOnly] = React.useState(initialInStock);
  const [priceRange, setPriceRange] = React.useState<PriceRangeKey>(initialPriceRange);
  const [sort, setSort] = React.useState<CatalogSortOption>(initialSort);

  // Sincronizar con props cuando cambian (desde fuera)
  useEffect(() => {
    setInStockOnly(initialInStock);
    setPriceRange(initialPriceRange);
    setSort(initialSort);
  }, [initialInStock, initialPriceRange, initialSort]);

  // Cerrar con ESC
  useEffect(() => {
    if (!open) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [open, onClose]);

  // Bloquear scroll del body cuando está abierto
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const buildUrl = (
    newInStock: boolean,
    newPriceRange: PriceRangeKey,
    newSort: CatalogSortOption,
  ) => {
    const params = new URLSearchParams();

    // Preservar parámetros adicionales
    Object.entries(preserveParams).forEach(([key, value]) => {
      if (value) {
        params.set(key, value);
      }
    });

    // Agregar filtros
    if (newInStock) {
      params.set("inStock", "true");
    }

    if (newPriceRange !== "all") {
      params.set("priceRange", newPriceRange);
    }

    if (newSort !== "relevance") {
      params.set("sort", newSort);
    }

    // Resetear page a 1 cuando cambian los filtros
    params.set("page", "1");

    return `${basePath}?${params.toString()}`;
  };

  const handleApply = () => {
    router.push(buildUrl(inStockOnly, priceRange, sort));
    onClose();
  };

  const handleClear = () => {
    const params = new URLSearchParams();

    // Preservar solo parámetros que no son filtros
    Object.entries(preserveParams).forEach(([key, value]) => {
      if (value) {
        params.set(key, value);
      }
    });

    params.set("page", "1");

    router.push(`${basePath}?${params.toString()}`);
    onClose();
  };

  const hasActiveFilters = initialInStock || initialPriceRange !== "all" || initialSort !== "relevance";

  if (!open) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/50 z-40 md:hidden"
        onClick={onClose}
        aria-hidden="true"
      />
      {/* Bottom Sheet */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-white rounded-t-2xl shadow-2xl max-h-[85vh] flex flex-col"
        style={{
          animation: open ? "slideInUp 0.3s ease-out" : undefined,
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="filters-sheet-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-600" aria-hidden="true" />
            <h2 id="filters-sheet-title" className="text-lg font-semibold text-gray-900">
              Filtros y orden
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500"
            aria-label="Cerrar filtros"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Toggle: Solo en stock */}
          <div className="space-y-2">
            <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
              <input
                type="checkbox"
                checked={inStockOnly}
                onChange={(e) => setInStockOnly(e.target.checked)}
                className="w-5 h-5 text-primary-600 border-gray-300 rounded focus:ring-primary-500 focus:ring-2"
                aria-label="Solo productos en stock"
              />
              <span className="text-base font-medium text-gray-900">Solo productos en stock</span>
            </label>
          </div>

          {/* Selector: Rango de precio */}
          <div className="space-y-2">
            <label htmlFor="price-range-sheet" className="block text-sm font-medium text-gray-700">
              Rango de precio
            </label>
            <select
              id="price-range-sheet"
              value={priceRange}
              onChange={(e) => setPriceRange(e.target.value as PriceRangeKey)}
              className="w-full text-base border border-gray-300 rounded-lg px-4 py-3 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 min-h-[44px]"
              aria-label="Seleccionar rango de precio"
            >
              <option value="all">Todos los precios</option>
              <option value="lt_500">Menos de $500</option>
              <option value="500_1000">$500 a $1,000</option>
              <option value="gt_1000">Más de $1,000</option>
            </select>
          </div>

          {/* Selector: Orden */}
          <div className="space-y-2">
            <label htmlFor="sort-sheet" className="block text-sm font-medium text-gray-700">
              Ordenar por
            </label>
            <select
              id="sort-sheet"
              value={sort}
              onChange={(e) => setSort(e.target.value as CatalogSortOption)}
              className="w-full text-base border border-gray-300 rounded-lg px-4 py-3 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 min-h-[44px]"
              aria-label="Seleccionar ordenamiento"
            >
              <option value="relevance">Relevancia</option>
              <option value="price_asc">Precio: menor a mayor</option>
              <option value="price_desc">Precio: mayor a menor</option>
              <option value="name_asc">Nombre: A-Z</option>
            </select>
          </div>

          {/* Chips de filtros activos */}
          {hasActiveFilters && (
            <div className="pt-2 pb-2">
              <p className="text-sm text-gray-500 mb-2">Filtros activos:</p>
              <div className="flex flex-wrap gap-2">
                {initialInStock && (
                  <span className="inline-flex items-center rounded-full border border-gray-300 px-3 py-1 text-sm text-gray-700 bg-gray-50">
                    En stock
                  </span>
                )}
                {initialPriceRange !== "all" && (
                  <span className="inline-flex items-center rounded-full border border-gray-300 px-3 py-1 text-sm text-gray-700 bg-gray-50">
                    {getPriceRangeLabel(initialPriceRange)}
                  </span>
                )}
                {initialSort !== "relevance" && (
                  <span className="inline-flex items-center rounded-full border border-gray-300 px-3 py-1 text-sm text-gray-700 bg-gray-50">
                    {initialSort === "price_asc" && "Precio: menor"}
                    {initialSort === "price_desc" && "Precio: mayor"}
                    {initialSort === "name_asc" && "Nombre: A-Z"}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer con botones */}
        <div className="p-4 border-t border-gray-200 flex gap-3 bg-gray-50 flex-shrink-0">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
          >
            Cancelar
          </button>
          <button
            onClick={handleClear}
            className="px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
          >
            Limpiar
          </button>
          <button
            onClick={handleApply}
            className="flex-1 px-4 py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
          >
            Aplicar
          </button>
        </div>
      </div>
    </>
  );
}
