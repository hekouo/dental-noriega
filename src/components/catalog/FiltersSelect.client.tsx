"use client";

import { useRouter } from "next/navigation";
import { type PriceRangeKey } from "@/lib/catalog/config";

type FiltersSelectProps = {
  inStockOnly: boolean;
  priceRange: PriceRangeKey;
  basePath: string;
  preserveParams?: Record<string, string>;
};

/**
 * Componente client para filtros de catálogo
 * Maneja checkbox "solo en stock" y select de rango de precio
 * Navega a la URL con los filtros seleccionados, reseteando page a 1
 */
export default function FiltersSelect({
  inStockOnly,
  priceRange,
  basePath,
  preserveParams = {},
}: FiltersSelectProps) {
  const router = useRouter();

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

  return (
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
  );
}

