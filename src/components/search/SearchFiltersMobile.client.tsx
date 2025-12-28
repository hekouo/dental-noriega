"use client";

import React from "react";
import { Filter } from "lucide-react";
import SearchFiltersSheet from "./SearchFiltersSheet.client";
import type { CatalogSortOption, PriceRangeKey } from "@/lib/catalog/config";

type Props = {
  inStockOnly: boolean;
  priceRange: PriceRangeKey;
  sort: CatalogSortOption;
  basePath: string;
  preserveParams?: Record<string, string>;
};

/**
 * Wrapper para filtros móviles: botón sticky + bottom sheet
 */
export default function SearchFiltersMobile({
  inStockOnly,
  priceRange,
  sort,
  basePath,
  preserveParams = {},
}: Props) {
  const [isOpen, setIsOpen] = React.useState(false);
  const hasActiveFilters = inStockOnly || priceRange !== "all" || sort !== "relevance";

  return (
    <>
      {/* Botón sticky solo en móvil */}
      <button
        onClick={() => setIsOpen(true)}
        className="md:hidden sticky top-16 z-30 w-full flex items-center justify-center gap-2 px-4 py-3 bg-white border border-gray-300 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 font-medium text-gray-900 hover:bg-gray-50 active:scale-95 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 min-h-[44px] mb-4"
        aria-label="Abrir filtros"
      >
        <Filter className={`w-5 h-5 ${hasActiveFilters ? "text-primary-600" : "text-gray-600"}`} />
        <span>Filtrar</span>
        {hasActiveFilters && (
          <span className="ml-1 inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary-600 text-white text-xs font-semibold">
            !
          </span>
        )}
      </button>

      {/* Bottom Sheet */}
      <SearchFiltersSheet
        open={isOpen}
        onClose={() => setIsOpen(false)}
        inStockOnly={inStockOnly}
        priceRange={priceRange}
        sort={sort}
        basePath={basePath}
        preserveParams={preserveParams}
      />
    </>
  );
}

