"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { type PriceRangeKey, getPriceRangeLabel } from "@/lib/catalog/config";

type FiltersSelectProps = {
  inStockOnly: boolean;
  priceRange: PriceRangeKey;
  basePath: string;
  preserveParams?: Record<string, string>;
};

/**
 * Componente client para filtros de catálogo
 * Maneja checkbox "solo en stock" y select de rango de precio
 * Muestra chips de filtros activos y botón para limpiarlos
 * Navega a la URL con los filtros seleccionados, reseteando page a 1
 */
export default function FiltersSelect({
  inStockOnly,
  priceRange,
  basePath,
  preserveParams = {},
}: FiltersSelectProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const hasActiveFilters = inStockOnly || priceRange !== "all";

  const buildUrl = (newInStock: boolean, newPriceRange: PriceRangeKey) => {
    const params = new URLSearchParams();

    // Preservar parámetros adicionales (ej: q, sort para búsqueda)
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

    // Resetear page a 1 cuando cambian los filtros
    params.set("page", "1");

    return `${basePath}?${params.toString()}`;
  };

  const handleInStockChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newInStock = e.target.checked;
    router.push(buildUrl(newInStock, priceRange));
  };

  const handlePriceRangeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newPriceRange = e.target.value as PriceRangeKey;
    router.push(buildUrl(inStockOnly, newPriceRange));
  };

  const handleClearFilters = () => {
    const params = new URLSearchParams();

    // Preservar parámetros que NO son filtros (ej: q, sort)
    Object.entries(preserveParams).forEach(([key, value]) => {
      if (value && key !== "inStock" && key !== "priceRange") {
        params.set(key, value);
      }
    });

    // Preservar sort desde searchParams si existe y no está en preserveParams
    if (searchParams) {
      const sort = searchParams.get("sort");
      if (sort && sort !== "relevance" && !preserveParams.sort) {
        params.set("sort", sort);
      }
    }

    // Forzar page a 1
    params.set("page", "1");

    // No agregar inStock ni priceRange (filtros eliminados)

    router.push(`${basePath}?${params.toString()}`);
  };

  return (
    <div className="space-y-3">
      {/* Controles de filtros */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
        {/* Checkbox "Solo productos en stock" */}
        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
          <input
            type="checkbox"
            checked={inStockOnly}
            onChange={handleInStockChange}
            className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500 focus:ring-2"
            aria-label="Solo productos en stock"
          />
          <span>Solo productos en stock</span>
        </label>

        {/* Select de rango de precio */}
        <div className="flex items-center gap-2">
          <label htmlFor="price-range-select" className="text-sm text-gray-700">
            Rango de precio:
          </label>
          <select
            id="price-range-select"
            value={priceRange}
            onChange={handlePriceRangeChange}
            className="text-sm border border-gray-300 rounded-md px-3 py-2 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            aria-label="Seleccionar rango de precio"
          >
            <option value="all">Todos los precios</option>
            <option value="lt_500">Menos de $500</option>
            <option value="500_1000">$500 a $1,000</option>
            <option value="gt_1000">Más de $1,000</option>
          </select>
        </div>
      </div>

      {/* Chips de filtros activos y botón limpiar */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-gray-500">Filtros activos:</span>
          {inStockOnly && (
            <span className="inline-flex items-center rounded-full border border-gray-300 px-2 py-0.5 text-xs text-gray-700 bg-gray-50">
              En stock
            </span>
          )}
          {priceRange !== "all" && (
            <span className="inline-flex items-center rounded-full border border-gray-300 px-2 py-0.5 text-xs text-gray-700 bg-gray-50">
              {getPriceRangeLabel(priceRange)}
            </span>
          )}
          <button
            type="button"
            onClick={handleClearFilters}
            className="ml-2 text-xs text-blue-600 hover:text-blue-700 underline underline-offset-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 rounded"
            aria-label="Limpiar todos los filtros"
          >
            Limpiar filtros
          </button>
        </div>
      )}
    </div>
  );
}

